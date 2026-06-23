import aiKnowledge from "@/lib/ai_knowledge.json";

export type AIStreamEvent = { type: string; data: string | Record<string, unknown> | null };
export type AIStreamCallback = (event: AIStreamEvent) => void;

export async function createMapPlanClient(
  songName: string,
  starRating: number,
  audioAnalysis: Record<string, unknown>,
  allowedPatterns: string[],
  apiKey: string,
  onEvent: AIStreamCallback
) {
  if (!apiKey || apiKey === "coloque_sua_chave_aqui") {
    throw new Error("Missing or invalid OPENROUTER_API_KEY");
  }

  const systemPrompt = `Você é uma IA especialista em rhythm games e criação de mapas para Rhythia.
Você deve agir como o Diretor Geral do mapa. Você não gera JSON final do jogo, você gera um "Plano Diretor".

Base de Conhecimento Oficial (Extraída dos mapas favoritos do usuário):
${JSON.stringify(aiKnowledge, null, 2)}

Use as regras matemáticas acima para definir a densidade e o multiplicador de notas de cada seção do seu plano baseado no StarRating pedido.`;

  const userPrompt = `Você vai receber uma análise técnica de áudio para gerar um plano de mapa do jogo Rhythia.

Regras:
- A dificuldade real é baseada em StarRating.
- Não gere o JSON final do Rhythia.
- Retorne apenas um JSON de plano musical.
- O mapa deve respeitar drops, pausas, vocais, build-ups, breaks e mudanças de energia.
- Use os eventos reais do áudio como referência.
- Em silêncio ou pausa, reduza muito as notas.
- Em drop, aumente densidade e agressividade.
- Em vocal/fala, use padrões ritmados e menos caóticos.
- Em build-up, aumente a densidade gradualmente.
- Em intro/outro, use baixa densidade.
- O plano precisa ajudar o código local a gerar Notes sincronizadas.

Retorne obrigatoriamente neste formato (apenas JSON válido, sem blockquotes de markdown tipo \`\`\`json):

{
  "sections": [
    {
      "startMs": 0,
      "endMs": 15000,
      "type": "intro",
      "intensity": 0.3,
      "densityMultiplier": 0.5,
      "patternStyle": "simple_diagonal",
      "notesStrategy": "use only strong beats"
    }
  ],
  "globalStyle": {
    "recommendedPatternMix": ["diagonal", "center_corners", "zigzag"],
    "syncPriority": "beats_onsets_energy_peaks",
    "avoid": ["notes during silence", "uniform timing", "repeating same position too much"]
  }
}

Tipos possíveis de section:
- intro
- verse
- build
- drop
- break
- outro

ATENÇÃO: O usuário RESTRINGIU os pattern styles permitidos. VOCÊ SÓ PODE USAR OS PATTERN STYLES NESTA LISTA. SE ESCOLHER ALGO FORA DA LISTA, O GERADOR VAI FALHAR:
Padrões PERMITIDOS pelo usuário: ${allowedPatterns ? allowedPatterns.join(", ") : "snake, stairs, jumps, bursts, rotation, calm_center, simple_diagonal"}

Significado dos padrões:
- snake (Ideal para vocais contínuos, gritos longos, sons de guitarra fluida. Cria uma trilha conectada)
- stairs (Escadas em diagonal, excelente para build-ups ou transições escalonadas)
- jumps (Pulos entre os cantos opostos, use para batidas secas, kicks muito pesados e isolados)
- rotation (Rotação fluida pelo grid, ótimo para preenchimento de tensão)
- bursts (Padrão explosivo e agressivo em áreas aleatórias, OBRIGATÓRIO para drops extremamente intensos)
- calm_center (Notas relaxadas focadas no meio, perfeito para breaks e intros)
- simple_diagonal (Variação padrão de ritmo calmo)

Agora analise estes dados:
SONG_NAME: ${songName}
STAR_RATING: ${starRating}
AUDIO_ANALYSIS: ${JSON.stringify(audioAnalysis)}

Retorne apenas JSON válido, sem markdown.`;

  const models = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-2-9b-it:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-120b:free",
    "deepseek/deepseek-v4-flash:free",
    "minimax/minimax-m2.5:free",
    "poolside/laguna-m.1:free",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-oss-20b:free",
    "poolside/laguna-xs.2:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openrouter/owl-alpha"
  ];

  let parsedPlan = null;
  let lastError = "";

  for (const model of models) {
    onEvent({ type: "status", data: `Tentando modelo: ${model.split("/")[1]}` });

    try {
      console.log(`Trying model: ${model}`);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000);

      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Rhythia AutoMapper"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.4
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!openRouterResponse.ok) {
        throw new Error(`HTTP Error: ${openRouterResponse.status}`);
      }

      const aiData = await openRouterResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "";

      content = content.trim();
      if (content.startsWith("\`\`\`json")) {
        content = content.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
      } else if (content.startsWith("\`\`\`")) {
        content = content.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
      }

      parsedPlan = JSON.parse(content);

      if (parsedPlan && parsedPlan.sections) {
        console.log(`Success with model: ${model}`);
        break;
      } else {
        throw new Error("Invalid JSON structure returned");
      }
    } catch (e: unknown) {
      const isTimeout = (e as { name?: string }).name === "AbortError";
      const errorMsg = isTimeout ? "Timeout (30s) excedido" : (e as Error).message;
      console.error(`Model ${model} failed:`, errorMsg);
      onEvent({ type: "status", data: `Falha no ${model.split("/")[1]} (${errorMsg}). Pulando...` });

      lastError = errorMsg;
      parsedPlan = null;

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (!parsedPlan) {
    onEvent({ type: "error", data: "Todos os modelos falharam. Último erro: " + lastError });
    return null;
  } else {
    onEvent({ type: "success", data: parsedPlan });
    return parsedPlan;
  }
}
