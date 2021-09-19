import fetch from 'node-fetch';
import { leagueConfig } from './config/index.js';

const leagueId = leagueConfig.leagueId;
const seasonId = leagueConfig.seasonId;
const espnS2 = leagueConfig.espnS2;
const SWID = leagueConfig.SWID;
const slackKey = leagueConfig.slackKey;

const espnBaseUrl = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}`;

const getLeagueMembers = async () => {
    const response = await fetch(espnBaseUrl, {
        headers: {
            cookie: `swid=${SWID}; espn_s2=${espnS2}`
        },
        method: 'GET'
    });

    const leagueData = await response.json();
    return leagueData.teams;
}

const getLeagueStats = async () => {
    const response = await fetch(`${espnBaseUrl}?view=mMatchup`, {
        headers: {
            cookie: `swid=${SWID}; espn_s2=${espnS2}`
        },
        method: 'GET'
    });

    return response.json();
}

const getLeagueSchedule = async () => {
    const response = await fetch(`${espnBaseUrl}?view=mTeam`, {
        headers: {
            cookie: `swid=${SWID}; espn_s2=${espnS2}`
        },
        method: 'GET'
    });

    return response.json();
}

const postMessageToSlack = (message, week) => {
    fetch(`https://hooks.slack.com/services/${slackKey}`, {
        body: JSON.stringify({
            channel: '#testing-text-output',
            username: 'Fantasy-Footbot',
            attachments: [
                {
                    fallback: ':rednecknerd:',
                    title: `Sunday Showdown - Games for week ${week}`,
                    text: message,
                    color: '#0C7BDC'
                }
            ],
            icon_emoji: ':referee:'
        }),
        headers : {
            'Content-Type': 'application/json'
        },
        method: 'POST'
    });
}

(async () => {
    const leagueMembers = await getLeagueMembers();

    const scoreBoard = leagueMembers.reduce((obj, team) => {
        return (
            obj[team.id] = {
                name: `${team.location} ${team.nickname}`,
                wins: 0,
                losses: 0,
                ties: 0,
                points: 0,
                projectedRank: null
            }, 
            obj
        );
    }, {});

    const leagueStats = await getLeagueStats();
    const pastMatchups = leagueStats.schedule.filter((matchup) => matchup.matchupPeriodId < leagueStats.scoringPeriodId);

    pastMatchups.forEach((matchup) => {
        const winnerHomeOrAway = matchup.winner.toLowerCase();

        if (winnerHomeOrAway === 'home') {
            scoreBoard[matchup.home.teamId].wins++;
            scoreBoard[matchup.away.teamId].losses++;
        } else if (winnerHomeOrAway === 'away') {
            scoreBoard[matchup.home.teamId].losses++;
            scoreBoard[matchup.away.teamId].wins++;
        // Only wins or losses recorded, so not sure what a tie looks like when returned from the espn api
        } else {
            scoreBoard[matchup.home.teamId].ties++;
            scoreBoard[matchup.away.teamId].ties++;
        }
    });

    const thisWeeksMatchups = leagueStats.schedule.filter((matchup) => {
        return matchup.matchupPeriodId === leagueStats.scoringPeriodId;
    });

    const schedule = (await getLeagueSchedule()).teams;

    schedule.forEach((team) => {
        scoreBoard[team.id].points = team.points;
        scoreBoard[team.id].projectedRank = team.currentProjectedRank;
    });

    let game = 1;
    let message = `
        Matchups for Week ${thisWeeksMatchups[0].matchupPeriodId}:
    `;

    thisWeeksMatchups.forEach((matchup) => {
        const home = scoreBoard[matchup.home.teamId];
        const away = scoreBoard[matchup.away.teamId];

        message += (`
            =============================
            Game ${game++}
            ${home.name} (${home.wins}/${home.losses}/${home.ties}) - ESPN Projected Rank: ${home.projectedRank} 
            vs.
            ${away.name} (${away.wins}/${away.losses}/${away.ties}) - ESPN Projected Rank: ${away.projectedRank}
            =============================
        `);
    });

    postMessageToSlack(message, thisWeeksMatchups[0].matchupPeriodId);
})();
