'use strict';


function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl.split('?')[0]}`,
    error: 'Not Found',
    statusCode: 404,
  });
}

module.exports = { notFoundHandler };
