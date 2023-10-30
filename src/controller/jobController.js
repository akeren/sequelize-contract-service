const { Sequelize } = require('sequelize');
const { Profile, Contract, Job, sequelize } = require('../model');
const { processPayment } = require('../util/processPayment');

exports.getUnpaidJobs = async (req, res) => {
	const { id, type } = req.profile;

	const profileAlias = type === 'client' ? 'Client' : 'Contractor';

	const status = 'in_progress';

	try {
		const userWithUnpaidJobs = await Profile.findOne({
			where: { id },
			include: [
				{
					model: Contract,
					as: profileAlias,
					where: { status: status },
					include: {
						model: Job,
						where: { paid: null, paymentDate: null }
					}
				}
			],
			subQuery: false
		});

		if (!userWithUnpaidJobs) {
			console.info(`${type.toUpperCase()} doesn't have unpaid contract jobs`, [
				{ id, type }
			]);

			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: `You currently don't have unpaid contract job.`
			});
		}

		console.log(`Unpaid contract jobs retrieved successfully`);

		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: `Unpaid contract jobs retrieved successfully`,
			data: userWithUnpaidJobs.Contractor
		});
	} catch (error) {
		console.error('Unable to retrieved unpaid contract jobs', [
			{ message: error.message, stackTrace: error.stack }
		]);

		return res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An error occurred processing request.'
		});
	}
};

exports.payForJob = async (req, res) => {
	const { id, type } = req.profile;
	const jobId = req.params.job_id;

	const dbTransaction = await sequelize.transaction({
		isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
	});

	try {
		if (type !== 'client') {
			console.info(`Contractor attempted to make payment and it was denied`, [
				{ id, type }
			]);

			return res.status(401).json({
				status: false,
				code: res.statusCode,
				message: 'Only clients can make payments'
			});
		}

		const job = await Job.findByPk(jobId, {
			include: [
				{
					model: Contract
				}
			],
			transaction: dbTransaction,
			lock: Sequelize.Transaction.LOCK.UPDATE
		});

		console.info(
			`Initiating a check, if the contract for the job is assigned a client`,
			[{ jobId }]
		);
		if (!job.Contract.ClientId) {
			await dbTransaction.rollback();

			console.info(`The contract for this job has not been assigned a client`, [
				{ jobId }
			]);

			return res.status(400).json({
				status: false,
				code: res.statusCode,
				message: `The contract is yet to be assigned a client`
			});
		}

		console.info(
			`Initiating a check, if the contract for the job is assigned a contractor`,
			[{ jobId }]
		);
		if (!job.Contract.ContractorId) {
			await dbTransaction.rollback();

			console.info(`This job is yet to be assigned a contractor`, [
				{ client: id, jobId }
			]);

			return res.status(400).json({
				status: false,
				code: res.statusCode,
				message: `The contract is yet to be assigned a contractor`
			});
		}

		if (job.Contract.ClientId !== id) {
			await dbTransaction.rollback();

			console.info(
				`Client attempted to make payment for someone else's contract job and was denied`,
				[{ id, type }]
			);

			return res.status(401).json({
				status: false,
				code: res.statusCode,
				message: 'You can only pay for contract that are assigned to you'
			});
		}

		if (!job) {
			await dbTransaction.rollback();

			return res.status(404).json({
				status: false,
				code: res.statusCode,
				message: 'Job not found'
			});
		}

		if (job.paid) {
			await dbTransaction.rollback();

			console.info(`This job has been paid already`, [{ jobId }]);
			return res.status(400).json({
				status: false,
				code: res.statusCode,
				message: 'Job is already paid'
			});
		}

		console.info(`Initiating payment processing`, [
			{
				jobId,
				client: id,
				contractorId: job.Contract.ContractorId
			}
		]);

		await processPayment(
			job.Contract.ClientId,
			job.Contract.ContractorId,
			job.price,
			dbTransaction
		);

		job.paid = true;
		job.paymentDate = new Date();
		await job.save({ transaction: dbTransaction });

		await dbTransaction.commit();

		console.info(`Payment lifecycle completed with a DB commit`);

		return res.status(200).json({
			status: true,
			code: res.statusCode,
			message: 'Payment successfully processed',
			data: job
		});
	} catch (error) {
		await dbTransaction.rollback();

		console.error(`An error occurred while performing payment`, [
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		res.status(400).json({
			status: false,
			code: res.statusCode,
			message: error.message
		});
	}
};
