# Auth-e-mailsjablonen

Supabase verstuurt de inlogmails, niet de app. Deze bestanden staan hier zodat
ze in versiebeheer zitten en niet alleen in een dashboard; plakken doe je met
de hand.

## Waar

Supabase → **Authentication** → **Email Templates**. Plak de inhoud van het
bestand in het HTML-veld en zet het onderwerp erbij.

| Bestand | Template | Onderwerp |
|---|---|---|
| `magic-link.html` | Magic Link | Je inlogcode voor League of Gamblers |
| `confirm-signup.html` | Confirm signup | Welkom bij League of Gamblers |

"Confirm signup" is wat een nieuw adres krijgt, "Magic Link" wat een bestaand
adres krijgt. Beide zijn nodig — `signInWithOtp` gebruikt de eerste voor
onbekende adressen.

## Waarom de code erin staat

Het inlogscherm belooft "een link én een inlogcode" en heeft een invulveld
voor die code. Supabase' standaardsjabloon toonde alleen de link, dus wie zijn
mail op een ander apparaat las dan waarop hij inlogde, had niets om in te
typen. `{{ .Token }}` lost dat op.

**Dit project geeft codes van 8 cijfers**, geen 6 — dat is een projectinstelling
onder Auth → Email (bereik 6–10). Het invoerveld staat op 10 zodat het een
wijziging overleeft.

## Vervaltijd

De teksten zeggen "vervallen na een uur", wat de standaard van Supabase is.
Verander je die instelling, pas dan ook deze zin aan — een mail die liegt over
zijn geldigheid kost meer support dan hij bespaart.

## Testen

Vraag een inlogcode aan op `/login` en kijk in Resend → Logs of de mail eruit
ging, en hoe hij eruitziet. Let op de per-adres-limiet van ongeveer één mail
per minuut; gebruik een tweede adres als je herhaaldelijk test.
