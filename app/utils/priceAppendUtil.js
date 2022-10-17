import { fetchPrices } from "../services/datasource";
import { getDataSource, getValue } from "../services/repository";
import { relistCards, relistForFixedPrice } from "./reListUtil";
import {
  appendContractInfo,
  appendDuplicateTag,
  appendPackPrice,
  appendPrice,
  appendPriceToSlot,
  appendRelistExternal,
  appendSectionTotalPrices,
  appendSquadTotal,
} from "./uiUtils/appendItems";
import {
  getSellBidPrice, roundOffPrice
} from "./priceUtil";

export const appendCardPrice = async (listRows, isFromPacks) => {
  const enhancerSetting = getValue("EnhancerSettings") || {};
  if (!listRows.length || enhancerSetting["idFutBinPrice"] === false) {
    return;
  }
  const cards = [];
  for (const { data } of listRows) {
    cards.push(data);
  }
  const dataSource = getDataSource();
  const prices = await fetchPrices(cards);
  let totalExternalPrice = 0;
  let totalBid = 0;
  let totalBin = 0;
  const clubSquadIds = getValue("squadMemberIds") || new Set();
  for (const { __auction, data, __root } of listRows) {
    const auctionElement = $(__auction);
    const rootElement = $(__root);
    const { definitionId, contract, _auction: auctionData } = data;
    const cardPrice = prices.get(`${definitionId}_${dataSource}_price`);
    let maxPrice = (+enhancerSetting["idBarginThreshold"] / 100) * cardPrice;
    maxPrice = getSellBidPrice(roundOffPrice(maxPrice));
    appendContractInfo(rootElement, contract);
    if (clubSquadIds.has(definitionId)) {
      appendDuplicateTag(rootElement);
    }
    if (cardPrice === undefined) {
      continue;
    }
    if (auctionElement.attr("style")) {
      auctionElement.removeAttr("style");
      auctionElement.addClass("hideauction");
    }
    console.log(auctionData);
    const bidPrice = auctionData.currentBid || auctionData.startingBid;
    totalBid += bidPrice;
    totalBin += auctionData.buyNowPrice;
    totalExternalPrice += cardPrice || 0;
    appendPrice(dataSource.toUpperCase(), auctionElement, cardPrice, maxPrice);
    checkAndAppendBarginIndicator(
      rootElement,
      auctionData.buyNowPrice,
      bidPrice,
      cardPrice
    );
  }
  isFromPacks && appendPackPrice(totalExternalPrice);
  return { totalBid, totalBin, totalExternalPrice };
};

const checkAndAppendBarginIndicator = (
  rootElement,
  binPrice,
  bidPrice,
  futBinPrice
) => {
  const enhancerSetting = getValue("EnhancerSettings") || {};
  const markBidBargain = enhancerSetting["idBidBargain"];
  futBinPrice =
    getSellBidPrice(roundOffPrice(futBinPrice * ((enhancerSetting["idBarginThreshold"] || 95) / 100)));
  if (
    (binPrice && futBinPrice > binPrice) ||
    (markBidBargain && bidPrice && futBinPrice > bidPrice)
  ) {
    rootElement.addClass("futbinLessPrice");
  }
};

export const appendSlotPrice = async (squadSlots) => {
  if (!squadSlots.length) {
    return;
  }
  const cards = [];
  for (const { item } of squadSlots) {
    cards.push(item);
  }
  const dataSource = getDataSource();
  const prices = await fetchPrices(cards);
  let total = 0;
  for (const { rootElement, item } of squadSlots) {
    const cardPrice = prices.get(`${item.definitionId}_${dataSource}_price`);
    total += cardPrice || 0;

    if (cardPrice) {
      const element = $(rootElement);
      appendPriceToSlot(element, cardPrice);
    }
  }
  appendSquadTotal(dataSource.toUpperCase(), total);
};

export const appendSectionPrices = async (sectionData) => {
  const dataSource = getDataSource();
  if (sectionData.listRows.length) {
    sectionData.isRelistSupported &&
      appendRelistExternal(
        sectionData.sectionHeader,
        sectionData.headerElement,
        dataSource.toUpperCase(),
        () => {
          relistCards(sectionData.sectionHeader);
        },
        () => {
          relistForFixedPrice(sectionData.sectionHeader);
        }
      );
    appendCardPrice(sectionData.listRows).then((prices) => {
      setTimeout(() => {
        appendSectionTotalPrices(
          sectionData.headerElement,
          dataSource.toUpperCase(),
          prices
        );
      }, 100);
    });
  }
};
