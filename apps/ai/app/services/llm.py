class LLMClient:
    def __init__(self, model: str = "llama3"):
        self.model = model

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        # TODO: Implement actual LLM call
        return "Placeholder response"
