const { Op } = require('sequelize');

exports.getAContract = async (req, res) => {
	const { Contract } = req.app.get('models');

	const { id } = req.params;

	const profileId = req.profile.id;

	try {
		const contract = await Contract.findOne({
			where: {
				id: id,
				ContractorId: profileId
			}
		});

		if (!contract) {
			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: `You're yet to be assigned a contract`
			});
		}

		console.info(`Successfully retrieved contract for user:`, [
			{ user: profileId }
		]);

		return res.status(200).json({
			status: true,
			message: 'Contract retrieved successfully',
			data: contract
		});
	} catch (error) {
		console.error('Error occurred retrieving an authenticated user contract:', [
			profileId,
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An occurred processing your request'
		});
	}
};

exports.getContracts = async (req, res) => {
	const { Contract } = req.app.get('models');

	const profileId = req.profile.id;

	try {
		const contracts = await Contract.findAll({
			where: {
				ContractorId: profileId,
				status: {
					[Op.in]: ['new', 'in_progress']
				}
			}
		});

		console.info(
			`Successfully retrieved only new and in_progress contracts for user:`,
			[{ user: profileId }]
		);
		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: 'Contracts retrieved successfully',
			data: contracts
		});
	} catch (error) {
		console.error('Error occurred retrieving all the contracts for user:', [
			profileId,
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An occurred processing your request'
		});
	}
};
