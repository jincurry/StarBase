package service

import (
	"strings"
	"testing"
)

func TestParseTagSuggestionsJSONFenced(t *testing.T) {
	reply := "Sure, here are tags:\n```json\n" +
		`[{"name":"ai-tools","reason":"It's an AI helper."},{"name":"go","reason":"Written in Go."}]` +
		"\n```\nLet me know!"
	got := parseTagSuggestions(reply)
	if len(got) != 2 {
		t.Fatalf("got %d", len(got))
	}
	if got[0].Name != "ai-tools" || got[1].Name != "go" {
		t.Fatalf("names=%+v", got)
	}
}

func TestParseTagSuggestionsRawArray(t *testing.T) {
	reply := `[{"name":"INFRA","reason":"x"}, {"name":"infra","reason":"dup"}, {"name":"web app","reason":"y"}]`
	got := parseTagSuggestions(reply)
	if len(got) != 2 {
		t.Fatalf("dedupe failed: %d", len(got))
	}
	if got[0].Name != "infra" {
		t.Fatalf("normalize failed: %+v", got)
	}
	if got[1].Name != "web-app" {
		t.Fatalf("space→dash failed: %+v", got)
	}
}

func TestParseTagSuggestionsCapsAt5(t *testing.T) {
	pieces := []string{}
	for i := 0; i < 10; i++ {
		pieces = append(pieces, `{"name":"t`+string(rune('a'+i))+`","reason":"r"}`)
	}
	reply := "[" + strings.Join(pieces, ",") + "]"
	got := parseTagSuggestions(reply)
	if len(got) != 5 {
		t.Fatalf("got %d want 5", len(got))
	}
}

func TestNormalizeTagStripsJunk(t *testing.T) {
	cases := map[string]string{
		"  Hello World!  ":              "hello-world",
		"go_lang":                        "go-lang",
		"UPPER":                          "upper",
		"x":                              "x",
		"":                               "",
		"this-name-is-way-too-long-to-actually-fit-anywhere-useful": "this-name-is-way-too-long-to-act",
	}
	for in, want := range cases {
		if got := normalizeTag(in); got != want {
			t.Errorf("normalize(%q) = %q want %q", in, got, want)
		}
	}
}

func TestAIDisabledByDefault(t *testing.T) {
	a := NewAI(nil, nil, nil, "", "")
	if a.Enabled() {
		t.Fatal("Enabled() should be false without API key")
	}
}
