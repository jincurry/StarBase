package service

import "errors"

// Service-level sentinel errors. Handlers use errors.Is to map these
// to HTTP status codes — string-matching the message text is fragile
// and breaks the moment someone capitalises "Not found".
var (
	ErrNotFound      = errors.New("not found")
	ErrInvalidInput  = errors.New("invalid input")
	ErrInvalidStatus = errors.New("invalid status")
	ErrConflict      = errors.New("conflict")
	ErrAIDisabled    = errors.New("AI features not configured")
)
