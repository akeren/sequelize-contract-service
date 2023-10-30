const { Profile } = require('../model');

const getProfile = async (req, res, next) => {
	try {
		const profileId = req.get('profile_id') || 0;

		console.info(`Begin the process to authenticate a user`, [{ profileId }]);

		const profile = await Profile.findByPk(profileId);

		if (!profile) {
			console.info(`Unable to authenticate getProfile middleware for a user`, [
				{ profileId }
			]);

			return res.status(401).json({
				status: false,
				code: res.statusCode,
				message: 'Invalid credentials '
			});
		}

		console.info(`Successfully authenticated (user) getProfile middleware`, [
			{ profileId }
		]);

		req.profile = profile;

		next();
	} catch (error) {
		console.error('Error in getting an auth profile:', [
			{
				message: error.message,
				stackTrace: error.stack
			}
		]);

		res.status(500).json({
			status: false,
			code: res.statusCode,
			message: 'An error occurred processing request.'
		});
	}
};

module.exports = { getProfile };
