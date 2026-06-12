// One-off: inject the adminEmail namespace + nav.email key into all 4 message files.
import { readFileSync, writeFileSync } from 'fs'

const K = {
  en: {
    nav: 'Email',
    ns: {
      title: 'Email broadcast', subtitle: 'Compose an email and send it to one user, a company, or everyone with a company. Bulk sends are throttled automatically.',
      audience: 'Audience', audience_user: 'One user', audience_company: 'One company', audience_all: 'All users with a company',
      search_user: 'Search name or email…', select_user: 'Select a user…', select_company: 'Select a company…',
      recipients: 'recipient(s)', subject: 'Subject', body_placeholder: 'Write your message…',
      body_hint: "Plain text. Blank line = new paragraph. Use '{{name}}' to insert the recipient’s name.",
      footer_preview: 'Footer (added automatically, in the recipient’s language)',
      footer_text: 'You are receiving this email because you have a Piedro Portal account.',
      schedule: 'Send time', send_now: 'Send now', send_later: 'Schedule',
      throttle_note: 'Bulk sends go out in small paced batches (about 80 emails per 5 minutes) to protect deliverability.',
      send_test: 'Send test to me', btn_send: 'Send', btn_schedule: 'Schedule send', working: 'Working…',
      created: 'Campaign created — {count} recipient(s) queued.', test_sent: 'Test email sent to your address.',
      processed: 'Processed: {sent} sent, {remaining} remaining.',
      history: 'Campaigns', process_now: 'Process queue now', no_campaigns: 'No campaigns yet.',
      col_subject: 'Subject', col_audience: 'Audience', col_scheduled: 'Scheduled', col_progress: 'Sent', col_status: 'Status',
      status_scheduled: 'Scheduled', status_sending: 'Sending', status_sent: 'Sent', status_cancelled: 'Cancelled',
      cancel: 'Cancel', failed: 'failed',
    },
  },
  nl: {
    nav: 'E-mail',
    ns: {
      title: 'E-mail verzending', subtitle: 'Stel een e-mail op en stuur deze naar één gebruiker, één bedrijf of iedereen met een bedrijf. Bulkverzendingen worden automatisch gedoseerd.',
      audience: 'Doelgroep', audience_user: 'Eén gebruiker', audience_company: 'Eén bedrijf', audience_all: 'Alle gebruikers met bedrijf',
      search_user: 'Zoek naam of e-mail…', select_user: 'Kies een gebruiker…', select_company: 'Kies een bedrijf…',
      recipients: 'ontvanger(s)', subject: 'Onderwerp', body_placeholder: 'Schrijf uw bericht…',
      body_hint: "Platte tekst. Lege regel = nieuwe alinea. Gebruik '{{name}}' om de naam van de ontvanger in te voegen.",
      footer_preview: 'Voettekst (automatisch toegevoegd, in de taal van de ontvanger)',
      footer_text: 'U ontvangt deze e-mail omdat u een Piedro Portal-account heeft.',
      schedule: 'Verzendtijd', send_now: 'Nu verzenden', send_later: 'Inplannen',
      throttle_note: 'Bulkverzendingen gaan in kleine gedoseerde batches (ca. 80 e-mails per 5 minuten) om de afleverbaarheid te beschermen.',
      send_test: 'Test naar mij sturen', btn_send: 'Verzenden', btn_schedule: 'Verzending inplannen', working: 'Bezig…',
      created: 'Campagne aangemaakt — {count} ontvanger(s) in de wachtrij.', test_sent: 'Test-e-mail naar uw adres verzonden.',
      processed: 'Verwerkt: {sent} verzonden, {remaining} resterend.',
      history: 'Campagnes', process_now: 'Wachtrij nu verwerken', no_campaigns: 'Nog geen campagnes.',
      col_subject: 'Onderwerp', col_audience: 'Doelgroep', col_scheduled: 'Gepland', col_progress: 'Verzonden', col_status: 'Status',
      status_scheduled: 'Gepland', status_sending: 'Bezig met verzenden', status_sent: 'Verzonden', status_cancelled: 'Geannuleerd',
      cancel: 'Annuleren', failed: 'mislukt',
    },
  },
  fr: {
    nav: 'E-mail',
    ns: {
      title: 'Envoi d’e-mails', subtitle: 'Rédigez un e-mail et envoyez-le à un utilisateur, une entreprise ou à tous les utilisateurs rattachés à une entreprise. Les envois en masse sont régulés automatiquement.',
      audience: 'Destinataires', audience_user: 'Un utilisateur', audience_company: 'Une entreprise', audience_all: 'Tous les utilisateurs avec entreprise',
      search_user: 'Rechercher un nom ou un e-mail…', select_user: 'Choisir un utilisateur…', select_company: 'Choisir une entreprise…',
      recipients: 'destinataire(s)', subject: 'Objet', body_placeholder: 'Rédigez votre message…',
      body_hint: "Texte brut. Ligne vide = nouveau paragraphe. Utilisez '{{name}}' pour insérer le nom du destinataire.",
      footer_preview: 'Pied de page (ajouté automatiquement, dans la langue du destinataire)',
      footer_text: 'Vous recevez cet e-mail car vous disposez d’un compte Piedro Portal.',
      schedule: 'Heure d’envoi', send_now: 'Envoyer maintenant', send_later: 'Planifier',
      throttle_note: 'Les envois en masse partent par petits lots réguliers (environ 80 e-mails par 5 minutes) pour protéger la délivrabilité.',
      send_test: 'M’envoyer un test', btn_send: 'Envoyer', btn_schedule: 'Planifier l’envoi', working: 'En cours…',
      created: 'Campagne créée — {count} destinataire(s) en file.', test_sent: 'E-mail de test envoyé à votre adresse.',
      processed: 'Traité : {sent} envoyés, {remaining} restants.',
      history: 'Campagnes', process_now: 'Traiter la file maintenant', no_campaigns: 'Aucune campagne pour le moment.',
      col_subject: 'Objet', col_audience: 'Destinataires', col_scheduled: 'Planifié', col_progress: 'Envoyés', col_status: 'Statut',
      status_scheduled: 'Planifiée', status_sending: 'Envoi en cours', status_sent: 'Envoyée', status_cancelled: 'Annulée',
      cancel: 'Annuler', failed: 'échec(s)',
    },
  },
  de: {
    nav: 'E-Mail',
    ns: {
      title: 'E-Mail-Versand', subtitle: 'Verfassen Sie eine E-Mail und senden Sie sie an einen Benutzer, ein Unternehmen oder alle Benutzer mit Unternehmen. Massenversand wird automatisch gedrosselt.',
      audience: 'Empfänger', audience_user: 'Ein Benutzer', audience_company: 'Ein Unternehmen', audience_all: 'Alle Benutzer mit Unternehmen',
      search_user: 'Name oder E-Mail suchen…', select_user: 'Benutzer wählen…', select_company: 'Unternehmen wählen…',
      recipients: 'Empfänger', subject: 'Betreff', body_placeholder: 'Schreiben Sie Ihre Nachricht…',
      body_hint: "Reiner Text. Leerzeile = neuer Absatz. Verwenden Sie '{{name}}', um den Namen des Empfängers einzufügen.",
      footer_preview: 'Fußzeile (automatisch hinzugefügt, in der Sprache des Empfängers)',
      footer_text: 'Sie erhalten diese E-Mail, weil Sie ein Piedro Portal-Konto haben.',
      schedule: 'Versandzeit', send_now: 'Jetzt senden', send_later: 'Planen',
      throttle_note: 'Massenversand erfolgt in kleinen, gleichmäßigen Schüben (ca. 80 E-Mails pro 5 Minuten), um die Zustellbarkeit zu schützen.',
      send_test: 'Test an mich senden', btn_send: 'Senden', btn_schedule: 'Versand planen', working: 'Wird ausgeführt…',
      created: 'Kampagne erstellt — {count} Empfänger in der Warteschlange.', test_sent: 'Test-E-Mail an Ihre Adresse gesendet.',
      processed: 'Verarbeitet: {sent} gesendet, {remaining} verbleibend.',
      history: 'Kampagnen', process_now: 'Warteschlange jetzt verarbeiten', no_campaigns: 'Noch keine Kampagnen.',
      col_subject: 'Betreff', col_audience: 'Empfänger', col_scheduled: 'Geplant', col_progress: 'Gesendet', col_status: 'Status',
      status_scheduled: 'Geplant', status_sending: 'Wird gesendet', status_sent: 'Gesendet', status_cancelled: 'Abgebrochen',
      cancel: 'Abbrechen', failed: 'fehlgeschlagen',
    },
  },
}

for (const loc of ['en', 'nl', 'fr', 'de']) {
  const path = `messages/${loc}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  data.nav = { ...data.nav, email: K[loc].nav }
  data.adminEmail = { ...data.adminEmail, ...K[loc].ns }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${path} updated`)
}
