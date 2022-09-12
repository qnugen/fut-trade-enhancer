import {
  addBtnListner,
  downloadCsv,
  wait,
  hideLoader,
  showLoader,
} from "../utils/commonUtil";
import { MAX_CLUB_SEARCH } from "../app.constants";
import { getValue } from "./repository";
import { fetchPrices } from "./futbin";
import { t } from "../services/translate";

export const getSquadPlayerIds = () => {
  return new Promise((resolve, reject) => {
    const squadPlayerIds = new Set();
    getAllClubPlayers(true).then((squadMembers) => {
      squadMembers.forEach((member) => {
        squadPlayerIds.add(member.definitionId);
      });
      resolve(squadPlayerIds);
    });
  });
};

export const getSquadPlayerLookup = () => {
  return new Promise((resolve, reject) => {
    const squadPlayersLookup = new Map();
    getAllClubPlayers(true).then((squadMembers) => {
      squadMembers.forEach((member) => {
        squadPlayersLookup.set(member.definitionId, member);
      });
      resolve(squadPlayersLookup);
    });
  });
};

export const getAllClubPlayers = function (filterLoaned, playerId) {
  return new Promise((resolve, reject) => {
    const searchCriteria = new UTBucketedItemSearchViewModel().searchCriteria;
    if (playerId) {
      searchCriteria.defId = [playerId];
    }
    searchCriteria.count = MAX_CLUB_SEARCH;
    let gatheredSquad = [];

    const getAllSquadMembers = () => {
      getClubSquad(searchCriteria).observe(
        this,
        async function (sender, response) {
          gatheredSquad = [
            ...response.data.items.filter(
              (item) => !filterLoaned || item.loans < 0
            ),
          ];
          if (response.status !== 400 && !response.data.retrievedAll) {
            searchCriteria.offset += searchCriteria.count;
            await wait(1);
            getAllSquadMembers();
          } else {
            resolve(gatheredSquad);
          }
        }
      );
    };
    getAllSquadMembers();
  });
};

const getClubSquad = (searchCriteria) => {
  return services.Item.searchClub(searchCriteria);
};

const downloadClub = async () => {
  showLoader();
  let squadMembers = await getAllClubPlayers();
  squadMembers = squadMembers.sort((a, b) => b.rating - a.rating);

  await fetchPrices(squadMembers);

  let csvContent = "";
  const headers = t("csvFileHeader");
  csvContent += headers + "\r\n";
  for (const squadMember of squadMembers) {
    let rowRecord = "";
    rowRecord += squadMember._staticData.name + ",";
    rowRecord += squadMember.rating + ",";
    rowRecord += getCardQuality(squadMember) + ",";
    if (ItemRarity[squadMember.rareflag]) {
      rowRecord += !squadMember.rareflag
        ? `${services.Localization.localize("item.raretype0")},`
        : ItemRarity[squadMember.rareflag] + ",";
    } else if (squadMember.isSpecial()) {
      rowRecord +=
        services.Localization.localize("search.cardLevels.cardLevel4") + ",";
    } else {
      rowRecord += ",";
    }
    rowRecord +=
      UTLocalizationUtil.positionIdToName(
        squadMember.preferredPosition,
        services.Localization
      ) + ",";
    rowRecord +=
      UTLocalizationUtil.nationIdToName(
        squadMember.nationId,
        services.Localization
      ) + ",";
    rowRecord +=
      UTLocalizationUtil.leagueIdToName(
        squadMember.leagueId,
        services.Localization
      ) + ",";
    rowRecord +=
      UTLocalizationUtil.teamIdToAbbr15(
        squadMember.teamId,
        services.Localization
      ) + ",";
    if (squadMember._itemPriceLimits) {
      rowRecord +=
        `${services.Localization.localize("abbr.minimum")}` +
        squadMember._itemPriceLimits.minimum +
        ` ${services.Localization.localize("abbr.maximum")}` +
        squadMember._itemPriceLimits.maximum +
        ",";
    } else {
      rowRecord += "--NA--,";
    }
    const existingValue = getValue(squadMember.definitionId);
    if (existingValue && existingValue.price) {
      rowRecord += existingValue.price + ",";
    } else {
      rowRecord += "--NA--,";
    }
    rowRecord += squadMember.lastSalePrice + ",";
    rowRecord += squadMember.discardValue + ",";
    rowRecord += squadMember.contract + ",";
    rowRecord += squadMember.untradeable + ",";
    rowRecord += (squadMember.loans >= 0) + ",";

    csvContent += rowRecord + "\r\n";
  }
  const club = services.User.getUser().getSelectedPersona().getCurrentClub();
  downloadCsv(csvContent, club.name);

  hideLoader();
};

const getCardQuality = (card) => {
  if (card.isGoldRating()) {
    return services.Localization.localize("search.cardLevels.cardLevel3");
  } else if (card.isSilverRating()) {
    return services.Localization.localize("search.cardLevels.cardLevel2");
  } else if (card.isBronzeRating()) {
    return services.Localization.localize("search.cardLevels.cardLevel1");
  }
  return "";
};

addBtnListner("#downloadClub", async function () {
  await downloadClub();
});
