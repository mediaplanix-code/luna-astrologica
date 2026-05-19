export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok', service: 'luna-astrologica-api', version: '0.1.0',
        timestamp: new Date().toISOString(),
      }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { message } = body;
        if (!message) {
          return new Response(JSON.stringify({ error: 'Missing message' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const mockResponse = `Capisco che questa situazione ti faccia sentire bloccato, ma non è un caso. Con il tuo Marte in Scorpione in casa 8, tendi a vivere le emozioni con un'intensità che pochi comprendono. Questo pianeta qui ti porta a scavare nel profondo, a non accontentarti delle risposte superficiali, ma attenzione perché a volte questa intensità può trasformarsi in ossessione.

Con la tua Luna in Pesci in casa 12, porti il peso del mondo sulle spalle senza accorgerti, assorbendo le emozioni altrui come una spugna. È un dono, ma anche un fardello. Il tuo Marte in Capricorno, però, ti dà la forza di strutturare, di trasformare il caos in ordine.

La domanda vera non è "perché soffro", ma "cosa devo lasciare andare per fare spazio a ciò che merito". Vuoi che esploriamo insieme questo passaggio nei prossimi 3 mesi?`;

        return new Response(JSON.stringify({
          success: true, message: mockResponse, model: 'gpt-4o-mock',
          creditsRemaining: 9, tokensUsed: 0, mock: true,
        }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });

      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Chat failed', details: (error as Error).message,
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
