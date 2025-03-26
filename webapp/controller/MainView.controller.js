sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("sfdcr1179.controller.MainView", {
        onInit: function () {
            const oModel = new JSONModel({
                lignes: [],
                solde: "0.00",
                selectedIndices: [],
                isFormValid: false,
                utilisateur: "",
                debutTraitement: new Date(),
                finTraitement: null
            });

            // Récupérer l'utilisateur Fiori
            if (sap.ushell && sap.ushell.Container) {
                const sUserId = sap.ushell.Container.getUser().getId();
                oModel.setProperty("/utilisateur", sUserId);
            }

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
            this.getView().setModel(oModel);
        },

        onAjouterLigne: function () {
            const oModel = this.getView().getModel();
            const aLignes = oModel.getProperty("/lignes");

            const nouvelleLigne = {
                posteId: aLignes.length + 1,
                codeTransac: "",
                libelleTransac: "",
                signe: "",
                montant: ""
            };

            aLignes.push(nouvelleLigne);
            oModel.setProperty("/lignes", aLignes);
            this.mettreAJourValidation();
        },

        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedContexts = oTable.getSelectedContexts();
            const aIndices = aSelectedContexts.map(ctx => parseInt(ctx.getPath().split("/")[2]));
            this.getView().getModel().setProperty("/selectedIndices", aIndices);
        },

        onSupprimerLigne: function () {
            const oModel = this.getView().getModel();
            let aLignes = oModel.getProperty("/lignes");
            const aSelectedIndices = oModel.getProperty("/selectedIndices") || [];

            if (!aSelectedIndices.length) {
                MessageToast.show("Veuillez sélectionner au moins une ligne à supprimer.");
                return;
            }

            aSelectedIndices.sort((a, b) => b - a).forEach(i => aLignes.splice(i, 1));
            aLignes = aLignes.map((ligne, index) => ({ ...ligne, posteId: index + 1 }));

            oModel.setProperty("/lignes", aLignes);
            oModel.setProperty("/selectedIndices", []);
            this.calculerSolde();
            this.mettreAJourValidation();
        },

        onMontantChange: function () {
            this.calculerSolde();
            this.mettreAJourValidation();
        },

        calculerSolde: function () {
            const oModel = this.getView().getModel();
            const aLignes = oModel.getProperty("/lignes");
            let total = 0;

            aLignes.forEach(ligne => {
                const montant = parseFloat(ligne.montant);
                if (!isNaN(montant)) {
                    total += montant;
                }
            });

            oModel.setProperty("/solde", total.toFixed(2));
            this.mettreAJourValidation();
        },

        onChampChange: function () {
            this.mettreAJourValidation();
        },

        validerChampsRequis: function () {
            debugger;
            const oView = this.getView();
            const oModel = oView.getModel();
            let isValid = true;

            // Champs requis du formulaire
            const champsForm = [
                "inputPointVente", "inputDateVente", "inputNumTransaction", "inputTypeTransaction",
                "inputNumCaisse", "inputDevise", "inputUtilisateur", "inputRefTicket",
                "inputDebut"
            ];

            champsForm.forEach(id => {
                const oField = oView.byId(id);
                const value = oField.getValue?.() || oField.getDateValue?.();
                if (!value) {
                    oField.setValueState("Error");
                    isValid = false;
                } else {
                    oField.setValueState("None");
                }
            });

            // Lignes – valider uniquement s’il y en a
            const aLignes = oModel.getProperty("/lignes") || [];

            if (aLignes.length > 0) {
                // noublie pas d'ajouter " || !ligne.signe "
                aLignes.forEach(ligne => {
                    if (!ligne.posteId || !ligne.codeTransac || ligne.montant === "") {
                        isValid = false;
                    }
                });
            }

            // Vérification du solde
            const solde = parseFloat(oModel.getProperty("/solde"));
            if (isNaN(solde) || solde !== 0) {
                isValid = false;
            }
            return isValid;
        },

        mettreAJourValidation: function () {
            const isValid = this.validerChampsRequis();
            this.getView().getModel().setProperty("/isFormValid", isValid);
        },

        onValider: function () {
            const oModel = this.getView().getModel();

            // 👉 1. Mettre le timestamp de fin
            oModel.setProperty("/finTraitement", new Date());

            // 👉 2. Afficher un toast (ou appeler un backend, envoyer IDoc etc.)
            MessageToast.show("Transaction envoyée à CAR avec succès.");

            // 👉 3. Logique d’envoi IDoc (à implémenter si besoin)
        },

        onNouveau: function () {
            const oModel = this.getView().getModel();
        
            // Réinitialiser les valeurs du modèle
            oModel.setProperty("/lignes", []);
            oModel.setProperty("/solde", "0.00");
            oModel.setProperty("/selectedIndices", []);
            oModel.setProperty("/finTraitement", null);
            oModel.setProperty("/debutTraitement", new Date());
            oModel.setProperty("/isFormValid", false);
        
            // Réinitialiser les champs manuellement modifiables
            const oView = this.getView();
            const champsReset = [
                "inputPointVente",
                "inputDateVente",
                "inputNumCaisse",
                "inputRefTicket"
            ];
        
            champsReset.forEach(id => {
                const oField = oView.byId(id);
                if (oField?.setValue) {
                    oField.setValue("");
                    oField.setValueState("None");
                }
            });
        
            // Toast pour retour utilisateur
            MessageToast.show("Formulaire réinitialisé.");
        },

        onQuitter: function () {
            debugger;
         
                //  Retour au Fiori Launchpad (home)
                sap.ushell.Container.getService("CrossApplicationNavigation")
                    .toExternal({ target: { shellHash: "#" } });
        
        }
        

        
        


    });
});
