const { Profile } = require('../model');

async function processPayment(clientId, contractorId, amount, transaction) {
	try {
		const client = await Profile.findByPk(clientId, { transaction });
		const contractor = await Profile.findByPk(contractorId, { transaction });

		if (!client || !contractor) {
			throw new Error('Client or contractor not found');
		}

		console.info('Client balance before deduction:', [
			{ clientId, balance: client.balance }
		]);

		console.info('Contractor balance before payment:', [
			{ contractorId, balance: contractor.balance }
		]);

		if (client.balance >= amount) {
			console.info(`Deducting the payment amount from the client's balance:`, [
				{ clientId, amount }
			]);

			client.balance -= amount;
			await client.save({ transaction });

			console.info('Client balance after successful deduction:', [
				{ id: clientId, balance: client.balance }
			]);

			console.info(`Crediting the contractor's balance:`, [
				{ contractorId, amount }
			]);

			contractor.balance += amount;
			await contractor.save({ transaction });

			console.info('Contractor balance after payment:', [
				{ id: contractorId, balance: contractor.balance }
			]);

			console.info('Payment processed successfully:', [
				{
					clientId,
					contractorId
				}
			]);

			return;
		}

		console.info(`Client doesn't have sufficient balance to make payment`, [
			{ clientId }
		]);

		throw new Error('Insufficient balance for payment');
	} catch (error) {
		console.error(`An error occurred while processing payment:`, [
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		throw new Error('Unable to process payment successfully');
	}
}

module.exports = { processPayment };
