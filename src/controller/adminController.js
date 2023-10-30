const { Op } = require('sequelize');
const { sequelize, Profile, Contract, Job } = require('../model');

exports.bestProfession = async (req, res) => {
	const { startDate, endDate } = req;

	const t = await sequelize.transaction();

	try {
		console.info(`Initiating the process to retrieved all the contractors`);
		const contractors = await Profile.findAll({
			where: {
				type: 'contractor'
			},
			attributes: ['id', 'profession'],
			transaction: t
		});

		console.info(
			`Calculating the total earnings for each contractor within the specified time:`,
			[{ startDate, endDate }]
		);
		const professionEarnings = await Promise.all(
			contractors.map(async (contractor) => {
				console.info(
					`Begin the process to get total earnings for a contractor:`,
					[{ contractorId: contractor.id }]
				);

				const totalEarnings = await Job.sum('price', {
					where: {
						'$Contract.ContractorId$': contractor.id,
						paid: true,
						paymentDate: { [Op.between]: [startDate, endDate] }
					},
					include: [
						{
							model: Contract,
							as: 'Contract',
							status: 'in_progress'
						}
					],
					transaction: t,
					lock: t.LOCK.UPDATE
				});

				return {
					profession: contractor.profession,
					totalEarnings: totalEarnings || 0
				};
			})
		);

		await t.commit();

		if (professionEarnings.length === 0) {
			console.info(
				`No earning gotten for the best profession for the specified time range:`,
				[{ startDate, endDate }]
			);

			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: 'No data found for the specified time range'
			});
		}

		console.info(`Finding the profession with the highest total earnings`);
		const bestProfession = professionEarnings.reduce((max, profession) =>
			max.totalEarnings > profession.totalEarnings ? max : profession
		);

		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: 'Best profession retrieved successfully',
			data: bestProfession
		});
	} catch (error) {
		await t.rollback();

		console.error('An error occurred retrieving best profession:', [
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		return res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An error occurred retrieving best profession'
		});
	}
};

exports.bestClients = async (req, res) => {
	const { startDate, endDate } = req;
	const { limit } = req.query;

	const limitValue = parseInt(limit, 10) || 2;

	try {
		console.info(`Initiating the process to retrieve clients with payment`);
		const clientsWithPayments = await Profile.findAll({
			where: {
				type: 'client'
			},
			attributes: [
				'id',
				[sequelize.literal('firstName || " " || lastName'), 'fullName']
			],
			include: [
				{
					model: Contract,
					as: 'Client',
					include: [
						{
							model: Job,
							attributes: [
								[sequelize.fn('SUM', sequelize.col('price')), 'totalPayments']
							],
							where: {
								paid: true,
								paymentDate: {
									[Op.between]: [startDate, endDate]
								}
							}
						}
					]
				}
			],
			subQuery: false,
			group: ['Profile.id'], // Group by client's ID to get a single row per client
			raw: true, // To get plain JSON objects,
			order: [[sequelize.fn('SUM', sequelize.col('price')), 'DESC']],
			limit: limitValue
		});

		if (clientsWithPayments.length === 0) {
			console.info(
				`No best client for the specified time range at the moment:`,
				[{ startDate, endDate }]
			);

			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: 'No best client for the specified time range at the moment'
			});
		}

		console.log(`Formatting best clients response`);
		const clientPayments = clientsWithPayments.map((client) => {
			return {
				id: client.id,
				fullName: client.fullName,
				paid: client['Client.Jobs.totalPayments'] || 0
			};
		});

		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: 'Clients payments',
			data: clientPayments
		});
	} catch (error) {
		console.error(`Unable to process best client request:`, [
			{ message: error.message, stackTrace: error.stack }
		]);

		res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An error occurred processing request'
		});
	}
};
