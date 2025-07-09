class ApiError extends Error{
    /**
     *
     */
    constructor(message="something went wrong ",statusCode,error = [], stack= "") {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.error = error;
        this.success = false;

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
        
    }


}
export {ApiError};