import { ApiError, ErrorType } from "./ApiError.js";

/**
 *  BAD_REQUEST = "BadRequest",
    NOT_FOUND = "NotFound",
    UNAUTHORIZED = "Unauthorized",
    FORBIDDEN = "Forbidden",
    INTERNAL = "Internal",
    BAD_TOKEN = "BadToken",
 */

export class BadRequestError extends ApiError {
    constructor(message: string = "Bad Request"){
        super(ErrorType.BAD_REQUEST, 400, message)
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = "Not Found"){
        super(ErrorType.NOT_FOUND, 404, message)
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = "Unauthorized"){
        super(ErrorType.UNAUTHORIZED, 401, message)
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = "Forbidden"){
        super(ErrorType.FORBIDDEN, 403, message)
    }
}

export class InternalError extends ApiError {
    constructor(message: string = "Internal Server Error"){
        super(ErrorType.INTERNAL, 500, message)
    }
}

export class BadTokenError extends ApiError {
    constructor(message: string = "Bad Token"){
        super(ErrorType.BAD_TOKEN, 401, message)
    }
}