import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

export default function Familles() {
  const navigate = useNavigate();
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [nouvelleFamille, setNouvelleFamille] = useState('');
  const [creationFamilleEnCours, setCreationFamilleEnCours] = useState(false);

  const [familleOuverte, setFamilleOuverte] = useState(null);
  const [nomEnEdition, setNomEnEdition] = useState(null); // { type: 'famille'|'sous-famille', id }
  const [valeurEdition, setValeurEdition] = useState('');

  const [nouvelleSousFamille, setNouvelleSousFamille] = useState({ nom: '', codePrefixe: '' });
  const [creationSousFamilleEnCours, setCreationSousFamilleEnCours] = useState(null);

  useEffect(() => {
    chargerFamilles();
  }, []);

  function chargerFamilles() {
    setChargement(true);
    appelApi('GET', '/familles')
      .then((liste) => setFamilles(liste.sort((a, b) => a.nom.localeCompare(b.nom))))
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function creerFamille() {
    if (!nouvelleFamille.trim()) return;
    setErreur('');
    setCreationFamilleEnCours(true);
    try {
      await appelApi('POST', '/familles', { nom: nouvelleFamille.trim() });
      setNouvelleFamille('');
      chargerFamilles();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationFamilleEnCours(false);
    }
  }

  async function creerSousFamille(familleId) {
    const { nom, codePrefixe } = nouvelleSousFamille;
    if (!nom.trim() || !codePrefixe.trim()) return;
    setErreur('');
    setCreationSousFamilleEnCours(familleId);
    try {
      await appelApi('POST', `/familles/${familleId}/sous-familles`, {
        nom: nom.trim(),
        codePrefixe: codePrefixe.trim(),
      });
      setNouvelleSousFamille({ nom: '', codePrefixe: '' });
      chargerFamilles();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationSousFamilleEnCours(null);
    }
  }

  function commencerEdition(type, id, valeurActuelle) {
    setNomEnEdition({ type, id });
    setValeurEdition(valeurActuelle);
  }

  async function validerEditionNom() {
    if (!nomEnEdition || !valeurEdition.trim()) { setNomEnEdition(null); return; }
    setErreur('');
    try {
      if (nomEnEdition.type === 'famille') {
        await appelApi('PUT', `/familles/${nomEnEdition.id}`, { nom: valeurEdition.trim() });
      } else {
        await appelApi('PUT', `/familles/${nomEnEdition.familleId}/sous-familles/${nomEnEdition.id}`, {
          nom: valeurEdition.trim(),
        });
      }
      setNomEnEdition(null);
      chargerFamilles();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function modifierPrefixeOuNumero(familleId, sousFamille, champ, valeur) {
    setErreur('');
    try {
      await appelApi('PUT', `/familles/${familleId}/sous-familles/${sousFamille.id}`, { [champ]: valeur });
      chargerFamilles();
    } catch (err) {
      setErreur(err.message);
      chargerFamilles();
    }
  }

  const [impressionListeEnCours, setImpressionListeEnCours] = useState(null);

  async function imprimerListeSousFamille(familleNom, sousFamille) {
    setErreur('');
    setImpressionListeEnCours(sousFamille.id);
    try {
      const articles = await appelApi('GET', `/articles?sousFamilleId=${sousFamille.id}`);
      const lignes = articles
        .slice()
        .sort((a, b) => a.designation.localeCompare(b.designation))
        .map((a) => `
          <tr>
            <td>${a.reference || ''}</td>
            <td>${a.designation}</td>
            <td>${a.codeBarre || '—'}</td>
            <td style="text-align:right">${Number(a.prixVente).toLocaleString('fr-FR')} F</td>
            <td style="text-align:right">${a.stockActuel}</td>
          </tr>`).join('');

      const html = `
        <html>
          <head>
            <title>${sousFamille.nom} — Jesma U</title>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #2A2118; }
              h1 { font-size: 18px; margin-bottom: 2px; }
              h2 { font-size: 14px; font-weight: normal; color: #6b5d4f; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
              th { background: #f2ece1; }
              tfoot td { font-weight: bold; border-top: 2px solid #333; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>${familleNom} — ${sousFamille.nom}</h1>
            <h2>Liste des articles — Jesma U — imprimé le ${new Date().toLocaleDateString('fr-FR')}</h2>
            <table>
              <thead>
                <tr><th>Référence</th><th>Désignation</th><th>Code-barres</th><th style="text-align:right">Prix vente</th><th style="text-align:right">Stock</th></tr>
              </thead>
              <tbody>${lignes || '<tr><td colspan="5">Aucun article dans cette sous-famille.</td></tr>'}</tbody>
              <tfoot>
                <tr><td colspan="4">Total articles</td><td style="text-align:right">${articles.length}</td></tr>
              </tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
          </body>
        </html>`;

      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setImpressionListeEnCours(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Familles &amp; sous-familles</h1>
      </div>

      <p style={styles.texteMuet}>
        Chaque sous-famille a un préfixe (ex : "ANDT") et un dernier numéro utilisé — le prochain article créé
        dans cette sous-famille recevra automatiquement le code préfixe + numéro suivant (ex : ANDT16).
        Modifier le préfixe ou le numéro ici ne change jamais les articles déjà créés, seulement le prochain code généré.
      </p>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

      <div style={styles.carte}>
        <div style={styles.formInline}>
          <input
            style={styles.champInput}
            placeholder="Nom de la nouvelle famille…"
            value={nouvelleFamille}
            onChange={(e) => setNouvelleFamille(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && creerFamille()}
          />
          <button onClick={creerFamille} disabled={creationFamilleEnCours} style={styles.boutonAjouter}>
            + Nouvelle famille
          </button>
        </div>
      </div>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && familles.map((f) => (
        <div key={f.id} style={styles.carte}>
          <div style={styles.ligneFamille} onClick={() => setFamilleOuverte(familleOuverte === f.id ? null : f.id)}>
            {nomEnEdition?.type === 'famille' && nomEnEdition.id === f.id ? (
              <input
                autoFocus
                style={styles.champInput}
                value={valeurEdition}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setValeurEdition(e.target.value)}
                onBlur={validerEditionNom}
                onKeyDown={(e) => e.key === 'Enter' && validerEditionNom()}
              />
            ) : (
              <h3 style={styles.nomFamille}>
                {f.nom}
                <button
                  onClick={(e) => { e.stopPropagation(); commencerEdition('famille', f.id, f.nom); }}
                  style={styles.boutonEditer}
                >
                  ✎
                </button>
              </h3>
            )}
            <span style={styles.texteMuet}>{f.sousFamilles.length} sous-famille(s)</span>
            <span style={styles.chevron}>{familleOuverte === f.id ? '▲' : '▼'}</span>
          </div>

          {familleOuverte === f.id && (
            <>
              <div style={styles.tableauWrapper}>
                <table style={styles.tableau}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Sous-famille</th>
                      <th style={styles.th}>Préfixe</th>
                      <th style={styles.th}>Dernier numéro utilisé</th>
                      <th style={styles.th}>Prochain code</th>
                      <th style={styles.th}>Description (site — repli si l'article n'en a pas)</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.sousFamilles.map((sf) => (
                      <tr key={sf.id}>
                        <td style={styles.td}>
                          {nomEnEdition?.type === 'sous-famille' && nomEnEdition.id === sf.id ? (
                            <input
                              autoFocus
                              style={styles.champInput}
                              value={valeurEdition}
                              onChange={(e) => setValeurEdition(e.target.value)}
                              onBlur={validerEditionNom}
                              onKeyDown={(e) => e.key === 'Enter' && validerEditionNom()}
                            />
                          ) : (
                            <>
                              {sf.nom}
                              <button
                                onClick={() => {
                                  setNomEnEdition({ type: 'sous-famille', id: sf.id, familleId: f.id });
                                  setValeurEdition(sf.nom);
                                }}
                                style={styles.boutonEditer}
                              >
                                ✎
                              </button>
                            </>
                          )}
                        </td>
                        <td style={styles.td}>
                          <input
                            style={styles.champPetit}
                            defaultValue={sf.codePrefixe}
                            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== sf.codePrefixe && modifierPrefixeOuNumero(f.id, sf, 'codePrefixe', e.target.value.trim())}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            style={styles.champPetit}
                            defaultValue={sf.dernierNumero}
                            onBlur={(e) => Number(e.target.value) !== sf.dernierNumero && modifierPrefixeOuNumero(f.id, sf, 'dernierNumero', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>
                          {sf.codePrefixe}{String(sf.dernierNumero + 1).padStart(2, '0')}
                        </td>
                        <td style={styles.td}>
                          <textarea
                            style={styles.champDescription}
                            placeholder="Ex : matières, entretien, âge conseillé…"
                            defaultValue={sf.description || ''}
                            onBlur={(e) => e.target.value.trim() !== (sf.description || '') && modifierPrefixeOuNumero(f.id, sf, 'description', e.target.value.trim())}
                          />
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => imprimerListeSousFamille(f.nom, sf)}
                            disabled={impressionListeEnCours === sf.id}
                            style={styles.boutonImprimer}
                          >
                            {impressionListeEnCours === sf.id ? '…' : '🖨️ Imprimer la liste'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {f.sousFamilles.length === 0 && (
                      <tr><td style={styles.td} colSpan={6}><span style={styles.texteMuet}>Aucune sous-famille pour l'instant.</span></td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={styles.formInlineSousFamille}>
                <input
                  key={`nom-${f.id}-${f.sousFamilles.length}`}
                  style={styles.champInput}
                  placeholder="Nom de la nouvelle sous-famille…"
                  defaultValue=""
                  onChange={(e) => setNouvelleSousFamille((v) => ({ ...v, nom: e.target.value }))}
                />
                <input
                  key={`prefixe-${f.id}-${f.sousFamilles.length}`}
                  style={styles.champPrefixeNouveau}
                  placeholder="Préfixe (ex: ANDT)"
                  defaultValue=""
                  onChange={(e) => setNouvelleSousFamille((v) => ({ ...v, codePrefixe: e.target.value }))}
                />
                <button
                  onClick={() => creerSousFamille(f.id)}
                  disabled={creationSousFamilleEnCours === f.id}
                  style={styles.boutonAjouter}
                >
                  + Ajouter
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16 },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 20 },
  formInline: { display: 'flex', gap: 10, maxWidth: 500 },
  formInlineSousFamille: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, flex: 1 },
  champPetit: { width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--cream-deep)', fontSize: 13 },
  champPrefixeNouveau: { width: 140, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  champDescription: { width: 220, minHeight: 40, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--cream-deep)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical' },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  boutonEditer: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--brown-soft)', marginLeft: 6, fontSize: 13 },
  boutonImprimer: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)', fontSize: 12, whiteSpace: 'nowrap' },
  ligneFamille: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  nomFamille: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 18, flex: 1 },
  chevron: { color: 'var(--brown-soft)', fontSize: 12 },
  tableauWrapper: { marginTop: 16, overflowX: 'auto' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
};
