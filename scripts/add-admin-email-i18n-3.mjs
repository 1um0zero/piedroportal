// One-off: audience label tweak, default greeting, extra To/Cc/Bcc keys.
import { readFileSync, writeFileSync } from 'fs'

const K = {
  en: {
    audience_all: 'All users (with Company assigned)',
    greeting: "Dear '{{name}}',",
    recip_edit: 'Edit To / Cc / Bcc',
    recip_placeholder: 'email@example.com, email2@example.com…',
    recip_hint: 'Added to every email this campaign sends. Bulk sends put each recipient in Bcc — the To field shows the sender address unless you set one here. Internal users (admins/staff) are excluded from bulk audiences.',
  },
  nl: {
    audience_all: 'Alle gebruikers (met toegewezen bedrijf)',
    greeting: "Beste '{{name}}',",
    recip_edit: 'Aan / Cc / Bcc bewerken',
    recip_placeholder: 'email@voorbeeld.nl, email2@voorbeeld.nl…',
    recip_hint: 'Toegevoegd aan elke e-mail van deze campagne. Bij bulkverzending staat elke ontvanger in Bcc — het Aan-veld toont het afzenderadres, tenzij u hier een instelt. Interne gebruikers (admins/medewerkers) worden uitgesloten van bulkverzendingen.',
  },
  fr: {
    audience_all: 'Tous les utilisateurs (avec entreprise attribuée)',
    greeting: "Bonjour '{{name}}',",
    recip_edit: 'Modifier À / Cc / Cci',
    recip_placeholder: 'email@exemple.fr, email2@exemple.fr…',
    recip_hint: 'Ajouté à chaque e-mail de cette campagne. En envoi groupé, chaque destinataire est en Cci — le champ À affiche l’adresse de l’expéditeur, sauf si vous en définissez une ici. Les utilisateurs internes (admins/personnel) sont exclus des envois groupés.',
  },
  de: {
    audience_all: 'Alle Benutzer (mit zugewiesenem Unternehmen)',
    greeting: "Guten Tag '{{name}}',",
    recip_edit: 'An / Cc / Bcc bearbeiten',
    recip_placeholder: 'email@beispiel.de, email2@beispiel.de…',
    recip_hint: 'Wird jeder E-Mail dieser Kampagne hinzugefügt. Beim Massenversand steht jeder Empfänger in Bcc — das An-Feld zeigt die Absenderadresse, sofern Sie hier keine festlegen. Interne Benutzer (Admins/Mitarbeiter) sind vom Massenversand ausgeschlossen.',
  },
}

for (const loc of ['en', 'nl', 'fr', 'de']) {
  const path = `messages/${loc}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  data.adminEmail = { ...data.adminEmail, ...K[loc] }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${path} updated`)
}
