import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  private formatError(status: number, exceptionResponse: unknown): unknown {
    return typeof exceptionResponse === 'object'
      ? exceptionResponse
      : { statusCode: status, message: exceptionResponse };
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const error = this.formatError(status, exception.getResponse());

    this.logger.error(`${request.method} ${request.url} - ${status}`, exception.stack);
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof error === 'object' && error),
    });
  }
}
