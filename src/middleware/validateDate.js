function validateDate(req, res, next) {
	const startDate = new Date(req.query.start);
	const endDate = new Date(req.query.end);

	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
		return res.status(400).json({
			status: false,
			code: 400,
			message: 'Invalid date format'
		});
	}

	req.startDate = startDate;
	req.endDate = endDate;
	next();
}

module.exports = { validateDate };
