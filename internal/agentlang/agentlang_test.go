package agentlang

import (
	"strings"
	"testing"
)

func TestCurrentDefaultsToVietnamese(t *testing.T) {
	t.Setenv(EnvAgentLanguage, "")
	if got := Current(); got != Vietnamese {
		t.Fatalf("Current() = %q, want %q", got, Vietnamese)
	}
}

func TestCurrentHonoursOverride(t *testing.T) {
	cases := map[string]string{
		"vi":      Vietnamese,
		"vi-VN":   Vietnamese,
		"en":      English,
		"English": English,
		"zh":      Chinese,
		"zh-CN":   Chinese,
		"  ":      Vietnamese,
		"unknown": Vietnamese,
	}
	for value, want := range cases {
		t.Setenv(EnvAgentLanguage, value)
		if got := Current(); got != want {
			t.Errorf("Current() with %q = %q, want %q", value, got, want)
		}
	}
}

func TestAppendAddsVietnameseDirectiveOnce(t *testing.T) {
	t.Setenv(EnvAgentLanguage, "vi")
	prompt := "Implement the change."
	once := Append(prompt)
	if !strings.HasPrefix(once, prompt) {
		t.Fatalf("Append dropped the original prompt: %q", once)
	}
	if !strings.Contains(once, "tiếng Việt") {
		t.Fatalf("Append did not add the Vietnamese directive: %q", once)
	}
	if twice := Append(once); twice != once {
		t.Fatalf("Append duplicated the directive:\n%q\n%q", once, twice)
	}
}

func TestAppendKeepsChineseUpstreamBehaviour(t *testing.T) {
	t.Setenv(EnvAgentLanguage, "zh")
	prompt := "实现这个需求。"
	if got := Append(prompt); got != prompt {
		t.Fatalf("Append() = %q, want the untouched prompt", got)
	}
}

func TestAppendOnEmptyPromptReturnsDirective(t *testing.T) {
	t.Setenv(EnvAgentLanguage, "en")
	got := Append("   ")
	if !strings.Contains(got, "Working language") {
		t.Fatalf("Append(empty) = %q, want the English directive", got)
	}
}
