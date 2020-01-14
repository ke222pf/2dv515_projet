const cheerio = require('cheerio')
const rp = require('request-promise')
const fs = require('fs')

// MAX_COUNT = How many pages to scrape
const MAX_COUNT = 200

// firstArticle = Name of wiki article to use at starting point
const firstArticle = 'Gaming'

const start = async (url = `https://en.wikipedia.org/wiki/${firstArticle}`) => {
  // visited contains visited links
  let visited = []
  // counts number of scraped pages
  let counter = 0

  // Fetching page, extracting page-specific body content and links, filtering links.
  let $ = await fetchCheerio(url)
  const links = await fetchLinks($)
  const wikiLinks = checkWikiLink(links)
  const filteredLinks = removeJPGandSVG(wikiLinks)

  // linksList contains links to visit
  const linkList = filteredLinks

  // write starting page to file
  writeToFile($, url.replace('https://en.wikipedia.org/wiki/', ''), filteredLinks)

  // Scraping each link in linkList
  for (const link of linkList) {
    if (counter < MAX_COUNT) {
      if (!visited.includes(link)) {
        const newLinks = await scrapeIt(`https://en.wikipedia.org${link}`, link.replace('/wiki/', ''))

        // Only count and add links if scraped page is fecthed (200) and not empty
        if (newLinks.length > 0) {
          // Pushing wiki-links from page to linkList
          newLinks.forEach(newLink => {
            linkList.push(newLink)
          })
          counter++
          visited.push(link)
        }
      }
    } else {
      break
    }
  }
  console.log(`${counter} wiki-pages scraped`)
}

// Scrapes page on given link. Calls writeToFile and returns a list of wiki-links from page
const scrapeIt = async (url, shortUrl) => {
  const $ = await fetchCheerio(url)
  if ($) {
    const links = fetchLinks($)
    const wikiLinks = checkWikiLink(links)
    const filteredLinks = removeJPGandSVG(wikiLinks)
    const html = $
    writeToFile(html, shortUrl, filteredLinks)
    return filteredLinks
  }
  return []
}
// Extracts all links from page
const fetchLinks = ($) => {
  const links = $('a').map((i, elem) => $(elem).attr('href')).get()
  return links
}

// Fecthes page and returns a cheerio-instance of page
const fetchCheerio = async (url) => {
  try {
    let result = await rp(url)
    return cheerio.load(result)
  } catch (err) {
    return false
  }
}

// Returns an array of links including "/wiki" from array of links
const checkWikiLink = (links) => {
  const wikiLinks = []
  links.forEach(link => {
    if (link.includes('/wiki/')) {
      wikiLinks.push(link)
    }
  })
  return wikiLinks
}

// Removes links ending with .jpg and.svg. Also remove links containing ":" (Wikipedia-menu-links)
const removeJPGandSVG = (links) => {
  const wikiLinks = []
  links.forEach(link => {
    if (!link.endsWith('.jpg') && !link.endsWith('.svg') && !link.includes(':')) {
      wikiLinks.push(link)
    }
  })
  return wikiLinks
}

// Writes raw-html, words, and links from given arguments on to file in separate folders.
const writeToFile = ($, url, links) => {
  let html = $.html()
  let text = $('div[id="mw-content-text"]').text()
  text = text.replace(/<\/?[^>]+>/ig, ' ')
  text = text.replace(/[\W_]+/g, ' ')

  // WRITING RAW HTML TO FILE
  fs.writeFile(`./data/html/${url}.html`, html, function (err) {
    if (err) {
      return console.log(err)
    }
    console.log(`Raw HTML saved to "./data/html/${url}.html"`)
  })

  // WRITING TEXT TO FILE
  fs.writeFile(`./data/words/${url}.txt`, text, function (err) {
    if (err) {
      return console.log(err)
    }
    console.log(`Text saved to file "./data/words/${url}.txt"`)
  })

  // WRITING LINKS TO FILE
  const writeStream = fs.createWriteStream(`./data/links/${url}.txt`)
  const pathName = writeStream.path
  links.forEach(value => writeStream.write(`${value}\n`))
  writeStream.on('finish', () => {
    console.log(`Links saved to file ${pathName}`)
  })
  writeStream.on('error', (err) => {
    console.error(`There is an error writing the file ${pathName} => ${err}`)
  })
  writeStream.end()
}

start()
