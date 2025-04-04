sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet"
], function (BaseController, JSONModel, MessageToast, MessageBox, Spreadsheet) {
    "use strict";

    return BaseController.extend("sfdcr1179.controller.MainView", {
        onInit: function () {
            const oModel = new JSONModel({
                lignes: [],
                solde: "0.00",
                selectedIndices: [],
                isFormValid: false,
                isExportEnabled: false,
                utilisateur: "",
                debutTraitement: new Date(),
                finTraitement: null
            });

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
            aLignes.push({
                posteId: aLignes.length + 1,
                codeTransac: "",
                libelleTransac: "",
                signe: "",
                montant: ""
            });
            oModel.setProperty("/lignes", aLignes);
            this.mettreAJourValidation();
        },

        onSelectionChange: function (oEvent) {
            const aSelectedContexts = oEvent.getSource().getSelectedContexts();
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
            const total = oModel.getProperty("/lignes")
                .reduce((acc, l) => acc + (parseFloat(l.montant) || 0), 0);
            oModel.setProperty("/solde", total.toFixed(2));
        },

        onChampChange: function () {
            this.mettreAJourValidation();
        },

        // validerChampsRequis: function () {
        //     const oView = this.getView();
        //     const oModel = oView.getModel();
        //     let isValid = true;

        //     const champsForm = [
        //         "inputPointVente", "inputDateVente", "inputNumTransaction", "inputTypeTransaction",
        //         "inputNumCaisse", "inputDevise", "inputUtilisateur", "inputRefTicket", "inputDebut"
        //     ];

        //     champsForm.forEach(id => {
        //         const oField = oView.byId(id);
        //         const value = oField.getValue?.() || oField.getDateValue?.();
        //         if (!value) {
        //             oField.setValueState("Error");
        //             isValid = false;
        //         } else {
        //             oField.setValueState("None");
        //         }
        //     });

        //     const aLignes = oModel.getProperty("/lignes") || [];
        //     if (aLignes.length) {
        //         aLignes.forEach(l => {
        //             if (!l.posteId || !l.codeTransac || l.montant === "") {
        //                 isValid = false;
        //             }
        //         });
        //     }

        //     const solde = parseFloat(oModel.getProperty("/solde"));
        //     if (isNaN(solde) || solde !== 0) {
        //         isValid = false;
        //     }

        //     return isValid;
        // },

        validerChampsRequis: function () {
            const oView = this.getView();
            const oModel = oView.getModel();
            let isValid = true;
        
            const champsForm = [
                "inputPointVente", "inputDateVente", "inputNumTransaction", "inputTypeTransaction",
                "inputNumCaisse", "inputDevise", "inputUtilisateur", "inputRefTicket", "inputDebut"
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
        
            const aLignes = oModel.getProperty("/lignes") || [];
            if (aLignes.length === 0) {
                isValid = false; // 👉 aucune ligne = non valide
            } else {
                aLignes.forEach(l => {
                    if (!l.posteId || !l.codeTransac || l.montant === "") {
                        isValid = false;
                    }
                });
            }
        
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
            const that = this;

            MessageBox.confirm("Souhaitez-vous valider et envoyer cette transaction à CAR ?", {
                title: "Confirmation de validation",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        oModel.setProperty("/finTraitement", new Date());
                        oModel.setProperty("/isExportEnabled", true);
                        MessageToast.show("Transaction envoyée à CAR avec succès.");
                    }
                }
            });
        },

        onNouveau: function () {
            const that = this;

            MessageBox.confirm("Souhaitez-vous réinitialiser le formulaire ?", {
                title: "Confirmation de réinitialisation",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        const oModel = that.getView().getModel();
                        oModel.setProperty("/lignes", []);
                        oModel.setProperty("/solde", "0.00");
                        oModel.setProperty("/selectedIndices", []);
                        oModel.setProperty("/finTraitement", null);
                        oModel.setProperty("/debutTraitement", new Date());
                        oModel.setProperty("/isFormValid", false);
                        oModel.setProperty("/isExportEnabled", false);

                        ["inputPointVente", "inputDateVente", "inputNumCaisse", "inputRefTicket"].forEach(id => {
                            const oField = that.getView().byId(id);
                            if (oField?.setValue) {
                                oField.setValue("");
                                oField.setValueState("None");
                            }
                        });

                        MessageToast.show("Formulaire réinitialisé.");
                    }
                }
            });
        },

        onQuitter: function () {
            MessageBox.confirm("Souhaitez-vous quitter le formulaire ?", {
                title: "Confirmation de sortie",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        sap.ushell.Container.getService("CrossApplicationNavigation")
                            .toExternal({ target: { shellHash: "#" } });
                    }
                }
            });
        },

        onExporter: function () {
            const that = this;
            MessageBox.confirm("Souhaitez-vous exporter les données au format Excel ?", {
                title: "Confirmation d’export",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that._exporterExcel();
                    }
                }
            });
        },

        _exporterExcel: function () {
            const oView = this.getView();
            const oModel = oView.getModel();
            const oData = oModel.getData();

            const dateVente = oView.byId("inputDateVente").getDateValue();
            const numCaisse = oView.byId("inputNumCaisse").getValue();
            const numTransaction = oView.byId("inputNumTransaction").getValue();
            const pointVente = oView.byId("inputPointVente").getValue();

            const dd = String(dateVente.getDate()).padStart(2, '0');
            const mm = String(dateVente.getMonth() + 1).padStart(2, '0');
            const yyyy = dateVente.getFullYear();
            const dateFormatted = `${dd}${mm}${yyyy}`;

            const fileName = `Reclassement_${numCaisse}_${numTransaction}_SGM_${pointVente}_${dateFormatted}.xlsx`;

            const formatDateTime = function (oDate) {
                if (!oDate) return "";
                const pad = (n) => (n < 10 ? '0' + n : n);
                return `${pad(oDate.getDate())}/${pad(oDate.getMonth() + 1)}/${oDate.getFullYear()} ${pad(oDate.getHours())}:${pad(oDate.getMinutes())}:${pad(oDate.getSeconds())}`;
            };

            const aRows = oData.lignes.map((ligne) => ({
                pointVente: pointVente,
                numCaisse: numCaisse,
                refTicket: oView.byId("inputRefTicket").getValue(),
                dateVente: `${dd}/${mm}/${yyyy}`,
                numTransaction: numTransaction,
                posteId: ligne.posteId,
                codeTransac: ligne.codeTransac,
                libelleTransac: ligne.libelleTransac,
                montant: ligne.montant,
                utilisateur: oData.utilisateur,
                debutTraitement: formatDateTime(oData.debutTraitement),
                finTraitement: formatDateTime(oData.finTraitement)
            }));

            const aCols = [
                { label: "Point de vente", property: "pointVente" },
                { label: "Numéro de caisse", property: "numCaisse" },
                { label: "Réf. Ticket Initial", property: "refTicket" },
                { label: "Date de vente", property: "dateVente" },
                { label: "Numéro de transaction", property: "numTransaction" },
                { label: "n° de Poste", property: "posteId" },
                { label: "Code Transaction Financière", property: "codeTransac" },
                { label: "Libellé Transaction financière", property: "libelleTransac" },
                { label: "Montants", property: "montant" },
                { label: "Utilisateur", property: "utilisateur" },
                { label: "Début du traitement", property: "debutTraitement" },
                { label: "Fin du traitement", property: "finTraitement" }
            ];

            const oSpreadsheet = new Spreadsheet({
                workbook: { columns: aCols },
                dataSource: aRows,
                fileName: fileName,
                worker: false
            });

            oSpreadsheet.build().finally(() => oSpreadsheet.destroy());
        }
    });
});
