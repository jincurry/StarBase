package apperror

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestErrorJSONShape(t *testing.T) {
	e := BadRequest("missing field")
	b, err := json.Marshal(e)
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	if out["code"] != "bad_request" {
		t.Fatalf("code=%v", out["code"])
	}
	if out["message"] != "missing field" {
		t.Fatalf("message=%v", out["message"])
	}
	// Status field is `json:"-"` so it should NOT serialize.
	if _, present := out["Status"]; present {
		t.Fatal("status should not appear in JSON")
	}
}

func TestErrorIsErrorInterface(t *testing.T) {
	var err error = NotFound("nope")
	if !errors.As(err, new(*Error)) {
		t.Fatal("errors.As failed")
	}
	if err.Error() != "not_found: nope" {
		t.Fatalf("Error()=%q", err.Error())
	}
}
