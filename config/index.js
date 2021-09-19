import fs from 'fs';
import path from 'path';

const configFile = JSON.parse(fs.readFileSync(path.join(path.resolve(), 'config.json')).toString());

export const leagueConfig = {
    espnS2: process.env.ESPN_S2 || configFile.espnS2,
    leagueId: process.env.LEAGUE_ID || configFile.leagueId,
    seasonId: process.env.SEASON_ID || configFile.seasonId,
    slackKey: process.env.SLACK_KEY || configFile.slackKey,
    SWID: process.env.SWID || configFile.SWID
}
