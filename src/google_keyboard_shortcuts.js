const extension = {
  options: {
    wrapNavigation: false,
    autoSelectFirst: true,
    nextKey: 'down, j',
    previousKey: 'up, k',
    navigatePreviousResultPage: 'left, h',
    navigateNextResultPage: 'right, l',
    navigateKey: 'return, space',
    navigateNewTabKey: 'ctrl+return, command+return, ctrl+space',
    navigateSearchTab: 'a, s',
    navigateImagesTab: 'i',
    navigateVideosTab: 'v',
    navigateMapsTab: 'm',
    navigateNewsTab: 'n',
    focusSearchInput: '/, escape'
  },

  lastNavigation: {
    lastQueryUrl: false,
    lastFocusedIndex: 0
  },

  init: function() {
    if (!/^(www|encrypted)\.google\./.test(window.location.hostname)) {
      return;
    }

    const params = getQueryStringParams();
    let optionsTask = this.loadOptions();

    // Don't initialize results navigation on image search, since it doesn't work
    // there.
    if (params['tbm'] !== 'isch') {
      // This file is loaded only after the DOM is ready, so no need to wait for
      // DOMContentLoaded.
      let afterOptions = () => {
        this.initResultsNavigation();
      };
      optionsTask.then(afterOptions, afterOptions);
    }
    optionsTask.then(this.initCommonGoogleSearchNavigation, this.initCommonGoogleSearchNavigation);
  },

  initResultsNavigation: function() {
    let options = this.options;
    let lastNavigation = this.lastNavigation;
    let results = getGoogleSearchLinks();
    let isFirstNavigation = true;

    if (options.autoSelectFirst) {
      // Highlight the first result when the page is loaded.
      results.focus(0);
    }
    loadLastNavigation().then(() => {
      if (location.href === lastNavigation.lastQueryUrl) {
        isFirstNavigation = false;
        results.focus(lastNavigation.lastFocusedIndex);
      }
    });
    key(options.nextKey, (event) => {
      if (!options.autoSelectFirst && isFirstNavigation) {
        results.focus(0);
        isFirstNavigation = false;
      }
      else {
        results.focusNext(options.wrapNavigation);
      }
      handleEvent(event);
    });
    key(options.previousKey, (event) => {
      if (!options.autoSelectFirst && isFirstNavigation) {
        results.focus(0);
        isFirstNavigation = false;
      }
      else {
        results.focusPrevious(options.wrapNavigation);
      }
      handleEvent(event);
    });
    key(options.navigateKey, (event) => {
      let link = results[results.focusedIndex];
      saveLastNavigation(results.focusedIndex);
      link.click();
      handleEvent(event);
    });
    key(options.navigateNewTabKey, (event) => {
      let link = results[results.focusedIndex];
      window.open(link.href);
      handleEvent(event);
    });
  },

  initCommonGoogleSearchNavigation: function() {
    let searchInput = document.getElementById('lst-ib');
    let options = this.options;

    key(options.focusSearchInput, (event) => {
      searchInput.focus();
      searchInput.select();
      handleEvent(event);
    });
    let all = getElementByXpath(
      '//a[contains(@class, \'q qs\') and not (contains(@href, \'&tbm=\')) and not (contains(@href, \'maps.google.\'))]');
    key(options.navigateSearchTab, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(all, event);
    });
    let images = getElementByXpath(
      '//a[contains(@class, \'q qs\') and (contains(@href, \'&tbm=isch\'))]');
    key(options.navigateImagesTab, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(images, event);
    });
    let videos = getElementByXpath(
      '//a[contains(@class, \'q qs\') and (contains(@href, \'&tbm=vid\'))]');
    key(options.navigateVideosTab, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(videos, event);
    });
    let maps = getElementByXpath(
      '//a[contains(@class, \'q qs\') and (contains(@href, \'maps.google.\'))]');
    key(options.navigateMapsTab, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(maps, event);
    });
    let news = getElementByXpath(
      '//a[contains(@class, \'q qs\') and (contains(@href, \'&tbm=nws\'))]');
    key(options.navigateNewsTab, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(news, event);
    });
    let previousResultPage = document.querySelector('#pnprev');
    key(options.navigatePreviousResultPage, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(previousResultPage, event);
    });
    let nextResultPage = document.querySelector('#pnnext');
    key(options.navigateNextResultPage, (event) => {
      updateUrlWithNodeHrefAndHandleEvent(nextResultPage, event);
    });
  },

  loadOptions: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(
        this.options,
        (items) => {
          if (chrome.runtime.lastError) {
            reject();
          } else {
            this.options = items;
            resolve();
          }
        });
    });
  }
};

function SearchResults(nodes) {
  this.items = Array.prototype.slice.call(nodes);
  this.focusedIndex = 0;

  this.focus = function(index) {
    if (this.focusedIndex >= 0) {
      this.items[this.focusedIndex].classList.remove('highlighted-search-result');
    }
    let newItem = this.items[index];
    newItem.classList.add('highlighted-search-result');
    newItem.focus();
    this.focusedIndex = index;
  };

  this.focusNext = function(shouldWrap) {
    let nextIndex = 0;

    if (this.focusedIndex < this.items.length - 1) {
      nextIndex = this.focusedIndex + 1;
    }
    else if (!shouldWrap) {
      nextIndex = this.focusedIndex;
    }

    this.focus(nextIndex);
  };

  this.focusPrevious = function(shouldWrap) {
    let previousIndex = this.items.length - 1;

    if (this.focusedIndex > 0) {
      previousIndex = this.focusedIndex - 1;
    }
    else if (!shouldWrap) {
      previousIndex = this.focusedIndex;
    }

    this.focus(previousIndex);
  }
}

const loadLastNavigation = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      extension.lastNavigation,
      (items) => {
        if (chrome.runtime.lastError) {
          reject();
        } else {
          extension.lastNavigation = items;
          resolve();
        }
      });
  });
};

const updateUrlWithNodeHrefAndHandleEvent = (node, event) => {
  if (node !== null) {
    location.href = node.href;
  }
  handleEvent(event);
};

const handleEvent = (event) => {
  if (event !== null) {
    event.stopPropagation();
    event.preventDefault();
  }
};

const getQueryStringParams = () => {
  const encodedQueryString = window.location.search.slice(1);
  const encodedParams = encodedQueryString.split('&');
  let params = {};
  for (const encodedParam of encodedParams) {
    let [key, encodedValue] = encodedParam.split('=');
    if (!encodedValue) {
      encodedValue = '';
    }
    // + (plus sign) is not decoded by decodeURIComponent so we need to decode
    // it manually.
    encodedValue = encodedValue.replace(/\+/g, ' ');
    params[key] = decodeURIComponent(encodedValue);
  }
  return params;
};

const getGoogleSearchLinks = function() {
  // the nodes are returned in the document order which is what we want
  return new SearchResults(document.querySelectorAll('h3.r a, #pnprev, #pnnext'));
};

function getElementByXpath(path) {
  return document
    .evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue;
}

const saveLastNavigation = (visitedIndex) => {
  chrome.storage.local.set(
    {
      lastQueryUrl: location.href,
      lastFocusedIndex: visitedIndex
    },
    null);
};

extension.init();
