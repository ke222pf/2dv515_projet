const cheerio = require('cheerio')
const rp = require('request-promise')
const fs = require('fs')

const MAX_COUNT = 200
const firstArticle = 'Computer'

const start = async (url = `https://en.wikipedia.org/wiki/${firstArticle}`) => {
  let visited = []
  let counter = 0
  let $ = await fetchCheerio(url)
  const links = await fetchLinks($)
  const wikiLinks = checkWikiLink(links)
  const filteredLinks = removeJPGandSVG(wikiLinks)
  const linkList = filteredLinks
  const html = $
  writeToFile(html, url.replace('https://en.wikipedia.org/wiki/', ''), filteredLinks)

  for (const link of linkList) {
    if (counter < MAX_COUNT) {
      if (!visited.includes(link)) {
        const newLinks = await scrapeIt(`https://en.wikipedia.org${link}`, link.replace('/wiki/', ''))
        newLinks.forEach(newLink => {
          linkList.push(newLink)
        })
        counter++
        visited.push(link)
      }
    }
  }
}

const scrapeIt = async (url, shortUrl) => {
  const $ = await fetchCheerio(url)
  const links = await fetchLinks($)
  const wikiLinks = checkWikiLink(links)
  const filteredLinks = removeJPGandSVG(wikiLinks)
  const html = $
  writeToFile(html, shortUrl, filteredLinks)
  return filteredLinks
}
const fetchLinks = async ($) => {
  const links = await $('a').map((i, elem) => $(elem).attr('href')).get()
  return links
}

const fetchCheerio = async (url) => {
  let result = await rp(url)
  return cheerio.load(result)
}

const checkWikiLink = (links) => {
  const wikiLinks = []
  links.forEach(link => {
    if (link.includes('/wiki/')) {
      wikiLinks.push(link)
    }
  })
  return wikiLinks
}
const removeJPGandSVG = (links) => {
  const wikiLinks = []
  links.forEach(link => {
    if (!link.endsWith('.jpg') && !link.endsWith('.svg') && !link.includes(':')) {
      wikiLinks.push(link)
    }
  })
  return wikiLinks
}

const writeToFile = ($, url, links) => {
  let html = $.html()
  let text = $.text()
  text = text.replace(/<\/?[^>]+>/ig, ' ')
  text = text.replace(/[\W_]+/g, ' ')

  // WRITING RAW HTML TO FILE
  fs.writeFile(`./data/html/${url}.txt`, html, function (err) {
    if (err) {
      return console.log(err)
    }
    console.log(`Raw HTML saved to "./data/html/${url}.txt"`)
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
