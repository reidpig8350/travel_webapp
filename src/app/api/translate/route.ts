import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLang = 'zh-TW', targetLang = 'it', sourceLangName = '繁體中文', targetLangName = '義大利文' } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ translatedText: '' });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: '尚未設定 GEMINI_API_KEY，請在 .env.local 或雲端環境變數中設定您的 Gemini API Key。',
        },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a courteous, natural, and highly accurate travel translator assisting a traveler in Europe (Italy, Switzerland, Austria).
Translate the following sentence from ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}).
Produce natural, polite phrasing suitable for conversations with shop assistants, cashiers, restaurant staff, or customer service.

Sentence to translate:
"${text.trim()}"`;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
        // ⭐️ 使用 Gemini API 官方格式化輸出屬性 (Structured Outputs)
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            translation: {
              type: 'STRING',
              description: 'The natural, polite translated sentence in the target language.',
            },
          },
          required: ['translation'],
        },
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gemini API Error Response:', res.status, errorText);
      let errMsg = `Gemini API 呼叫失敗 (代碼 ${res.status})`;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {
        // use fallback
      }
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let translatedText = '';
    try {
      // 解析符合 responseSchema 的結構化 JSON
      const parsed = JSON.parse(candidateText);
      translatedText = parsed.translation || '';
    } catch {
      // 若有異常，則清理字串防呆降級
      translatedText = candidateText.replace(/^["'「]+|["'」]+$/g, '').trim();
    }

    return NextResponse.json({
      translatedText,
      modelUsed: model,
    });
  } catch (error: unknown) {
    console.error('Translation route error:', error);
    const message = error instanceof Error ? error.message : '翻譯服務連線發生未知異常';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
