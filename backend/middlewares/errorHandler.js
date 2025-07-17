import { StatusCodes } from 'http-status-codes';

export default function errorHandler(err, req, res, next) {
  console.error(`[${req.method}] ${req.originalUrl} - ${err.message}`);
  res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: err.message || 'Lỗi máy chủ',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}
