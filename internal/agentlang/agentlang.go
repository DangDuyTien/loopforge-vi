// Package agentlang decides which human language AI agents must answer in.
//
// The platform UI copy is translated at runtime, but agent output is produced
// by external CLIs (Claude Code, Codex, CodeBuddy…) that know nothing about
// the interface language. This package appends one short directive to the
// prompts the platform already builds, so plans, progress reports, reviews,
// failure explanations and approval requests come back in the selected
// language without touching reasoning, code or raw logs.
package agentlang

import (
	"os"
	"strings"
)

// Supported agent response languages.
const (
	Vietnamese = "vi"
	English    = "en"
	Chinese    = "zh"
)

// EnvAgentLanguage overrides the agent response language. The Vietnamese
// edition defaults to Vietnamese; deployments that want the upstream
// behaviour set it to "zh".
const EnvAgentLanguage = "AGENTFLOW_AGENT_LANGUAGE"

// Current returns the configured agent response language.
func Current() string {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(EnvAgentLanguage))) {
	case "zh", "zh-cn", "chinese":
		return Chinese
	case "en", "english":
		return English
	case "", "vi", "vi-vn", "vietnamese":
		return Vietnamese
	default:
		return Vietnamese
	}
}

const viDirective = `## Ngôn ngữ làm việc
Luôn trả lời người dùng bằng tiếng Việt: phân tích, kế hoạch, báo cáo tiến độ, phân công, kết quả kiểm tra mã nguồn, giải thích lỗi, báo cáo kiểm thử, yêu cầu phê duyệt và báo cáo hoàn thành quy trình.
Giữ nguyên mã nguồn, định danh, khóa JSON, lệnh CLI, đường dẫn tệp và nhật ký terminal gốc; chỉ thêm giải thích tiếng Việt khi cần, không dịch nội dung kỹ thuật thô.`

const enDirective = `## Working language
Always answer the user in English: analysis, plans, progress reports, assignments, code review findings, failure explanations, test reports, approval requests and workflow completion reports.
Keep source code, identifiers, JSON keys, CLI commands, file paths and raw terminal logs unchanged; add an English explanation when useful instead of translating technical output.`

// Directive returns the prompt block for the current language, or "" for
// Chinese, which is the language the upstream prompts are written in.
func Directive() string {
	switch Current() {
	case Vietnamese:
		return viDirective
	case English:
		return enDirective
	default:
		return ""
	}
}

// Append adds the directive to a prompt unless it is already present.
func Append(prompt string) string {
	directive := Directive()
	if directive == "" {
		return prompt
	}
	marker := "## Ngôn ngữ làm việc"
	if Current() == English {
		marker = "## Working language"
	}
	if strings.Contains(prompt, marker) {
		return prompt
	}
	if strings.TrimSpace(prompt) == "" {
		return directive
	}
	return strings.TrimRight(prompt, "\n") + "\n\n" + directive + "\n"
}

// Text picks a user-facing backend message in the edition language. Backend
// logs and errors cannot read the browser preference, so they follow the same
// deployment-level setting as agent output.
func Text(vi, en, zh string) string {
	switch Current() {
	case English:
		return en
	case Chinese:
		return zh
	default:
		return vi
	}
}
