export default {
  async fetch(request, env) {
    // En-têtes pour autoriser les requêtes CORS depuis n'importe quelle application ou site web
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Role',
      'Content-Type': 'application/json'
    };

    // Gestion de la requête de pré-vol (Preflight CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Seules les requêtes HTTP POST sont autorisées pour exécuter des transactions
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        succes: false, 
        message: "Méthode non autorisée. Utilisez POST." 
      }), { 
        status: 405, 
        headers 
      });
    }

    try {
      const body = await request.json();
      const { action, montant, telephone, userRole } = body;

      // Clés API définies
      const PUBLIC_KEY = env.CAURISPAY_PK || "pk_caurispay_live_0fc0791f6c867fb085158c2ca55f6e4b";
      const SECRET_KEY = env.CAURISPAY_SK || "sk_caurispay_live_3560c1742d9635988477e57dc87a3450b4803b657b35097c";

      let urlApi = "";
      let apiKeyUtilisee = "";
      let payload = {};

      if (action === 'depot') {
        // --- LOGIQUE DE DÉPÔT ---
        urlApi = "https://api.caurispay.com/v1/deposit";
        apiKeyUtilisee = PUBLIC_KEY;
        payload = {
          montant: Number(montant),
          telephone: telephone
        };

      } else if (action === 'retrait') {
        // --- LOGIQUE DE RETRAIT (ADMINISTRATEUR ILLIMITÉ) ---
        if (userRole !== 'admin') {
          return new Response(JSON.stringify({ 
            succes: false, 
            message: "Accès refusé : Seul l'administrateur est autorisé à effectuer des retraits." 
          }), { 
            status: 403, 
            headers 
          });
        }

        urlApi = "https://api.caurispay.com/v1/payout";
        apiKeyUtilisee = SECRET_KEY;
        payload = {
          montant: Number(montant),
          telephone: telephone
        };

      } else {
        return new Response(JSON.stringify({ 
          succes: false, 
          message: "Action non valide. Spécifiez 'depot' ou 'retrait'." 
        }), { 
          status: 400, 
          headers 
        });
      }

      // Envoi sécurisé de la requête à l'API CaurisPay depuis le serveur Cloudflare
      const reponseCaurisPay = await fetch(urlApi, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKeyUtilisee}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resultat = await reponseCaurisPay.json();

      // Retourner la réponse officielle au client frontend
      return new Response(JSON.stringify({
        succes: reponseCaurisPay.ok,
        action: action,
        donnees: resultat
      }), { 
        status: reponseCaurisPay.status, 
        headers 
      });

    } catch (erreur) {
      return new Response(JSON.stringify({ 
        succes: false, 
        erreur: erreur.message 
      }), { 
        status: 500, 
        headers 
      });
    }
  }
};
