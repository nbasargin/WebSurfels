import { GSVCrawler } from '../../lib/street-view/gsv-crawler';

export class StreetViewCrawlerDemo {

    constructor() {
        const crawler = new GSVCrawler();
        crawler.crawl('s6A9P5A3iWvqNscixSRPsw', 10).then(ids => {
            console.log('crawl complete, found', ids.size, 'panoramas');
            console.log('ids', ids);
        });
    }

}
