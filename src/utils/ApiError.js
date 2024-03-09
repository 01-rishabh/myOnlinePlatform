class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],         //for defining multiple errors
        stack_ = ""
    ){
        super(message)
        this.statusCode  = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors


        if(stack_){
            this.stack = stack_
        }
        else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}