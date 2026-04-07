# Admin V1 (gratuit)

Cette V1 ajoute une interface admin a l'URL `/admin` pour editer:
- `data/contact.json`
- `data/services.json`
- `data/themes.json`

Les modifications seront publiees sur le site en ligne apres commit Git via Decap CMS.

## Prerequis

- Un compte Netlify (plan gratuit)
- Le depot GitHub connecte a Netlify
- Build command: vide
- Publish directory: `/`

## Configuration Netlify (authentification)

1. Ouvrir le site Netlify > `Site configuration` > `Identity`.
2. Activer Identity (`Enable Identity`).
3. Dans `Registration preferences`, choisir `Invite only`.
4. Dans `Services`, activer `Git Gateway`.
5. Inviter l'email du proprietaire depuis l'onglet `Identity`.
6. Accepter l'invitation recue par email et definir le mot de passe.

## Utilisation

1. Aller sur `/admin`.
2. Se connecter avec l'utilisateur invite.
3. Modifier les contenus.
4. Cliquer sur `Publish`.

Le commit est pousse sur `main`, puis Netlify redeploie automatiquement le site.

## Notes

- Le dossier des uploads est configure sur `images/uploads`.
- Les pages du site lisent deja les donnees JSON, donc les changements apparaissent sans modifier le code.
- Si vous hebergez ailleurs que Netlify, il faudra une autre methode d'auth pour Decap CMS.
