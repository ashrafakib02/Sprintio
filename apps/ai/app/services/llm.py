from pathlib import Path

from jinja2 import Environment, FileSystemLoader


_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


class LLMClient:
    """Lightweight wrapper around an LLM backend (stub for now)."""

    def __init__(self, model: str = "llama3") -> None:
        self.model = model
        self._env = Environment(
            loader=FileSystemLoader(str(_PROMPTS_DIR)),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    async def generate(
        self, prompt: str, system_prompt: str = "", *, template: str | None = None,
    ) -> str:
        """Generate a response from the LLM.

        Parameters
        ----------
        prompt:
            The user prompt to send.
        system_prompt:
            An optional system-level instruction.
        template:
            Optional Jinja2 template name from the ``prompts/`` directory.
            When provided, the prompt is rendered through the template first.
        """
        if template is not None:
            tmpl = self._env.get_template(template)
            prompt = tmpl.render(prompt=prompt, system_prompt=system_prompt)

        # TODO: Replace with a real LLM call (e.g. OpenAI, Ollama, etc.)
        return "Placeholder response"
