package crypto

import (
	"strings"
	"testing"
)

const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func TestAEADRoundTrip(t *testing.T) {
	a, err := NewAEAD(testKey)
	if err != nil {
		t.Fatalf("NewAEAD: %v", err)
	}
	plain := "ghp_secret_token_123"
	ct, err := a.Encrypt(plain)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if ct == plain {
		t.Fatal("ciphertext equals plaintext")
	}
	got, err := a.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != plain {
		t.Fatalf("round-trip mismatch: got %q want %q", got, plain)
	}
}

func TestAEADDifferentCiphertextEachCall(t *testing.T) {
	a, err := NewAEAD(testKey)
	if err != nil {
		t.Fatal(err)
	}
	a1, _ := a.Encrypt("same")
	a2, _ := a.Encrypt("same")
	if a1 == a2 {
		t.Fatal("nonce reuse: ciphertexts collide")
	}
}

func TestAEADRejectsBadKey(t *testing.T) {
	if _, err := NewAEAD("short"); err == nil {
		t.Fatal("expected error for non-hex key")
	}
	// Valid hex but wrong length.
	if _, err := NewAEAD("deadbeef"); err == nil {
		t.Fatal("expected error for 4-byte key")
	}
}

func TestAEADRejectsTamperedCiphertext(t *testing.T) {
	a, _ := NewAEAD(testKey)
	ct, _ := a.Encrypt("hello")
	tampered := strings.Replace(ct, ct[len(ct)-4:], "AAAA", 1)
	if _, err := a.Decrypt(tampered); err == nil {
		t.Fatal("expected decrypt to fail on tampered ciphertext")
	}
}

func TestRandomTokenLength(t *testing.T) {
	tok, err := RandomToken(16)
	if err != nil {
		t.Fatal(err)
	}
	// 16 bytes hex-encoded => 32 chars.
	if len(tok) != 32 {
		t.Fatalf("len=%d want 32", len(tok))
	}
}
