package com.codet.lens.common;

import jakarta.validation.ValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class ExceptionAdvice {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public R<String> methodArgumentNotValid(MethodArgumentNotValidException e) {
        FieldError error = e.getBindingResult().getFieldError();
        String msg = error == null ? "参数或系统错误" : error.getField() + error.getDefaultMessage();
        log.warn(msg);
        return R.fail(msg);
    }

    @ExceptionHandler(ValidationException.class)
    public R<String> validation(ValidationException e) {
        return R.fail(e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public R<String> notReadable(HttpMessageNotReadableException e) {
        log.warn(e.getMessage());
        return R.fail("参数或系统错误");
    }

    @ExceptionHandler(ResultException.class)
    public R<Object> result(ResultException e) {
        return R.fail(e.getCode(), e.getMsg(), e.getData());
    }

    @ExceptionHandler(Exception.class)
    public R<String> other(Exception e) {
        log.error(e.getMessage(), e);
        return R.fail(ResultEnum.FAIL.getMsg());
    }
}
