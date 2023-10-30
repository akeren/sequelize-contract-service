const { sequelize, Profile, Contract, Job } = require('../model');

exports.clientDeposit = async (req, res) => {
	const userId = req.params.userId;
	const { depositAmount } = req.body;

	console.info(`Initiating a DB transaction for client's deposit`, [
		{ profileId: userId }
	]);

	const t = await sequelize.transaction();

	try {
		console.info(`Find the client's profile and lock the row for updates`, [
			{ profileId: userId }
		]);

		const client = await Profile.findByPk(userId, {
			transaction: t,
			lock: t.LOCK.UPDATE
		});

		console.info(
			`Successfully retrieved client and locked the row for updates:`,
			[{ clientId: client.id }]
		);

		if (!client) {
			await t.rollback();

			console.info(`Couldn't find a client associated with the profile id:`, [
				{ profileId: userId }
			]);

			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: 'Client not found'
			});
		}

		if (client.type !== 'client') {
			await t.rollback();

			console.info(`A contractor attempted to make a deposit:`, [
				{ contractorId: client.id }
			]);

			return res.status(401).json({
				status: false,
				code: res.statusCode,
				message: 'Only clients can make deposit at the moment.'
			});
		}

		console.info(
			`Calculating the total amount to be paid by the client for unpaid jobs:`,
			[{ clientId: client.id }]
		);

		const totalAmountToPayForUnpaidJobs = await Job.sum('price', {
			where: {
				'$Contract.ClientId$': userId,
				paid: null,
				paymentDate: null
			},
			include: [
				{
					model: Contract,
					as: 'Contract'
				}
			],
			transaction: t
		});

		if (totalAmountToPayForUnpaidJobs === null) {
			console.info('No unpaid jobs for the client.', [{ clientId: client.id }]);

			await t.rollback();

			return res.status(400).json({
				status: false,
				code: res.statusCode,
				message: 'No unpaid jobs for the client'
			});
		}

		console.info(
			`Calculating the maximum allowed deposit (25% of totalAmountToPayForUnpaidJobs)`,
			[{ clientId: client.id, totalAmountToPayForUnpaidJobs }]
		);

		const maxDeposit = totalAmountToPayForUnpaidJobs * 0.25;

		console.info(`Successfully calculated maximum deposit for the client:`, [
			{ clientId: client.id, maxDeposit }
		]);

		if (depositAmount > maxDeposit) {
			await t.rollback();

			console.info(
				`Client deposit has exceeded the maximum allowed amount and was denied`,
				[{ clientId: client.id, maxDeposit }]
			);

			return res.status(400).json({
				status: false,
				code: res.statusCode,
				message: 'Deposit exceeds the maximum allowed amount'
			});
		}

		console.info(`Client's balance before performing the deposit:`, [
			{ clientId: client.id, balance: client.balance }
		]);

		client.balance += depositAmount;
		await client.save({ transaction: t });

		console.info(
			`Client's balance after successfully performing the deposit:`,
			[{ clientId: client.id, balance: client.balance }]
		);

		await t.commit();

		console.info(`Deposit successfully committed and executed`, [
			{ clientId: client.id, depositAmount }
		]);
		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: 'Deposit made successfully'
		});
	} catch (error) {
		await t.rollback();

		console.error(`Unable to successfully process deposit for the client:`, [
			{ message: error.message, stackTrace: error.stack }
		]);

		return res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An error occurred processing transaction.'
		});
	}
};
