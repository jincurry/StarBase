package apperror

import (
	"fmt"
	"net/http"
)

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
	Status  int    `json:"-"`
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func New(status int, code, message, hint string) *Error {
	return &Error{Status: status, Code: code, Message: message, Hint: hint}
}

func BadRequest(msg string) *Error      { return New(http.StatusBadRequest, "bad_request", msg, "") }
func Unauthorized(msg string) *Error    { return New(http.StatusUnauthorized, "unauthorized", msg, "") }
func Forbidden(msg string) *Error       { return New(http.StatusForbidden, "forbidden", msg, "") }
func NotFound(msg string) *Error        { return New(http.StatusNotFound, "not_found", msg, "") }
func Conflict(msg string) *Error        { return New(http.StatusConflict, "conflict", msg, "") }
func RateLimited(msg, hint string) *Error {
	return New(http.StatusTooManyRequests, "rate_limited", msg, hint)
}
func Internal(msg string) *Error { return New(http.StatusInternalServerError, "internal", msg, "") }
