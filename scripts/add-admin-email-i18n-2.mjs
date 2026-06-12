// One-off: rich-editor + signature keys for the adminEmail namespace (all 4 locales).
import { readFileSync, writeFileSync } from 'fs'

const K = {
  en: {
    body_hint: "Format with the toolbar; paste text, logos and photos directly (images are uploaded automatically). Use '{{name}}' to insert the recipient’s name.",
    signature: 'Signature (added to every broadcast — paste your logo here)',
    signature_hint: 'Paste or write the signature: name, logo, contacts…',
    save_signature: 'Save signature', signature_saved: 'Signature saved.',
    uploading_image: 'Uploading image…',
    tb_bold: 'Bold', tb_italic: 'Italic', tb_underline: 'Underline',
    tb_link: 'Insert link', tb_link_prompt: 'Link URL:', tb_image: 'Insert image', tb_clear: 'Clear formatting',
  },
  nl: {
    body_hint: "Opmaak via de werkbalk; plak tekst, logo’s en foto’s direct (afbeeldingen worden automatisch geüpload). Gebruik '{{name}}' om de naam van de ontvanger in te voegen.",
    signature: 'Handtekening (toegevoegd aan elke verzending — plak hier uw logo)',
    signature_hint: 'Plak of schrijf de handtekening: naam, logo, contactgegevens…',
    save_signature: 'Handtekening opslaan', signature_saved: 'Handtekening opgeslagen.',
    uploading_image: 'Afbeelding uploaden…',
    tb_bold: 'Vet', tb_italic: 'Cursief', tb_underline: 'Onderstrepen',
    tb_link: 'Link invoegen', tb_link_prompt: 'Link-URL:', tb_image: 'Afbeelding invoegen', tb_clear: 'Opmaak wissen',
  },
  fr: {
    body_hint: "Mettez en forme avec la barre d’outils ; collez texte, logos et photos directement (les images sont téléversées automatiquement). Utilisez '{{name}}' pour insérer le nom du destinataire.",
    signature: 'Signature (ajoutée à chaque envoi — collez votre logo ici)',
    signature_hint: 'Collez ou rédigez la signature : nom, logo, contacts…',
    save_signature: 'Enregistrer la signature', signature_saved: 'Signature enregistrée.',
    uploading_image: 'Téléversement de l’image…',
    tb_bold: 'Gras', tb_italic: 'Italique', tb_underline: 'Souligné',
    tb_link: 'Insérer un lien', tb_link_prompt: 'URL du lien :', tb_image: 'Insérer une image', tb_clear: 'Effacer la mise en forme',
  },
  de: {
    body_hint: "Formatieren Sie über die Symbolleiste; fügen Sie Text, Logos und Fotos direkt ein (Bilder werden automatisch hochgeladen). Verwenden Sie '{{name}}', um den Namen des Empfängers einzufügen.",
    signature: 'Signatur (wird jedem Versand hinzugefügt — fügen Sie hier Ihr Logo ein)',
    signature_hint: 'Signatur einfügen oder schreiben: Name, Logo, Kontaktdaten…',
    save_signature: 'Signatur speichern', signature_saved: 'Signatur gespeichert.',
    uploading_image: 'Bild wird hochgeladen…',
    tb_bold: 'Fett', tb_italic: 'Kursiv', tb_underline: 'Unterstrichen',
    tb_link: 'Link einfügen', tb_link_prompt: 'Link-URL:', tb_image: 'Bild einfügen', tb_clear: 'Formatierung entfernen',
  },
}

for (const loc of ['en', 'nl', 'fr', 'de']) {
  const path = `messages/${loc}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  data.adminEmail = { ...data.adminEmail, ...K[loc] }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${path} updated`)
}
