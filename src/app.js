const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');

// ROUTES
const contractRouter = require('./routes/contractRoutes');
const jobRouter = require('./routes/jobRoutes');
const balanceRouter = require('./routes/balanceRoutes');
const adminRouter = require('./routes/adminRoutes');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use('/contracts', contractRouter);
app.use('/jobs', jobRouter);
app.use('/balances', balanceRouter);
app.use('/admin', adminRouter);

app.all('*', (req, res, next) => {
	console.log(`Unhandled route detected`, [{ route: req.originalUrl }]);

	res.status(404).json({
		status: false,
		code: res.statusCode,
		message: `Can't find ${req.originalUrl} on this Server!`
	});
});

module.exports = app;
