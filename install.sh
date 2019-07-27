unzip -o back.zip -d /srv/backend;
rm -f back.zip;
rm -f install.sh;
pm2 reload app;