package service

import (
	"testing"
	"time"
)

func TestIntervalSecsClampsTo1(t *testing.T) {
	if intervalSecs(0) != 1 {
		t.Fatal("zero should clamp to 1")
	}
	if intervalSecs(-time.Hour) != 1 {
		t.Fatal("negative should clamp to 1")
	}
}

func TestIntervalSecsConverts(t *testing.T) {
	if intervalSecs(90*24*time.Hour) != 90*24*3600 {
		t.Fatal("90d conversion wrong")
	}
	if intervalSecs(7*24*time.Hour) != 7*24*3600 {
		t.Fatal("7d conversion wrong")
	}
}
