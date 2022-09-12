import { setValue } from "../services/repository";
import { t } from "../services/translate";

import {
  generateListForFutBinBtn,
  generateViewOnFutBinBtn,
} from "../utils/uiUtils/generateElements";

export const playerViewPanelOverride = () => {
  const calcTaxPrice = (buyPrice) => {
    const priceAfterTax = (buyPrice * 0.95).toLocaleString();
    $("#saleAfterTax").html(`${t("price")} ${priceAfterTax}`);
  };

  const panelViewFunc =
    controllers.items.ItemDetails.prototype._getPanelViewInstanceFromData;

  const buyPriceChanged = UTQuickListPanelView.prototype.onBuyPriceChanged;
  const quickListPanelGenerate = UTQuickListPanelView.prototype._generate;

  const quickPanelRenderView =
    UTQuickListPanelViewController.prototype.renderView;

  UTQuickListPanelView.prototype.onBuyPriceChanged = function (e, t, i) {
    buyPriceChanged.call(this, e, t, i);
    calcTaxPrice(this._buyNowNumericStepper.getValue());
  };

  UTQuickListPanelView.prototype.initFutBinEvent = function (e) {
    if (e.type !== "player") {
      $(this._futbinListFor.__root).css("display", "none");
      return;
    }
    $(this._futbinListFor.__root).css("display", "");
    setValue("selectedPlayer", e);
  };

  UTQuickListPanelView.prototype._generate = function (...args) {
    if (!this._generated) {
      quickListPanelGenerate.call(this, ...args);
      this._futbinListFor = generateListForFutBinBtn();
      this.__root.children[0].appendChild(this._futbinListFor.__root);
    }
  };

  UTQuickListPanelViewController.prototype.renderView = function () {
    quickPanelRenderView.call(this);
    let e = this.getView();
    e.initFutBinEvent(this.item);
  };

  controllers.items.ItemDetails.prototype._getPanelViewInstanceFromData =
    function (...args) {
      panelViewFunc.call(this, ...args);
      setTimeout(() => {
        const binControl = $(".ut-numeric-input-spinner-control").last();
        const binInput = binControl.find(".numericInput");
        const panelDisplayStyle = $(".more").css("display");
        if ($(".more").length) {
          if (!$(`button:contains(${t("viewFutBin")})`).length) {
            $(generateViewOnFutBinBtn().__root)
              .css("display", panelDisplayStyle)
              .insertAfter($(".more"));
          }
          if ($(".panelActions").length && !$("#saleAfterTax").length) {
            $(
              `<div  class="buttonInfoLabel hasPriceBanding">
                  <span class="spinnerLabel">${t("afterTax")}</span>
                  <span id="saleAfterTax" class="currency-coins bandingLabel">${t(
                    "price"
                  )} 10,000</span>
              </div>`
            ).insertAfter(binControl);
          }
        }
        binInput.val() &&
          calcTaxPrice(parseInt(binInput.val().replace(/[,.]/g, "")));
      });
    };
};
