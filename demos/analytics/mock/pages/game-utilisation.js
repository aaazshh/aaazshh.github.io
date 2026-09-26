// game-utilisation.php: game plays, players and stamps over the game
// utilisation index, as PHP computed them before rendering.
(function () {
  'use strict';
  var defTo = PM.daysAgo(1), defFrom = PM.firstOfMonth();
  if (defTo < defFrom) defFrom = defTo;
  var from = PM.get('date_from', defFrom).slice(0, 10), to = PM.get('date_to', defTo).slice(0, 10);
  if (to < from) to = from;
  PM.dateFrom = from; PM.dateTo = to;
  PM.game = PM.get('game', '').trim();
  var sort = PM.get('table_sort', 'most_played');
  PM.tableSort = ['most_played', 'least_played', 'highest_stamps', 'highest_unique_players'].indexOf(sort) === -1 ? 'most_played' : sort;
  var filters = [{ range: { updated_at: { gte: from + 'T00:00:00', lte: to + 'T23:59:59' } } }];
  if (PM.game !== '') {
    var should = [{ term: { 'name.keyword': PM.game } }, { match_phrase: { name: PM.game } }];
    if (!isNaN(Number(PM.game))) should.push({ term: { game_id: Number(PM.game) } });
    filters.push({ bool: { should: should, minimum_should_match: 1 } });
  }
  var res = Es.search(Crm.gamePlays(), { size: 0, query: { bool: { filter: filters } }, aggs: {
    unique_players: { cardinality: { field: 'member_id' } }, total_stamps: { sum: { field: 'stamps' } }, active_games: { cardinality: { field: 'game_id' } },
    trend: { date_histogram: { field: 'updated_at', calendar_interval: 'day', format: 'yyyy-MM-dd', min_doc_count: 0, extended_bounds: { min: from, max: to } },
      aggs: { unique_players: { cardinality: { field: 'member_id' } }, total_stamps: { sum: { field: 'stamps' } } } },
    games: { terms: { field: 'game_id', size: 1000, order: { _count: 'desc' } }, aggs: { game_name: { terms: { field: 'name.keyword', size: 1 } },
      unique_players: { cardinality: { field: 'member_id' } }, total_stamps: { sum: { field: 'stamps' } } } },
    players: { terms: { field: 'member_id', size: 10000, order: { _count: 'desc' } },
      aggs: { total_stamps: { sum: { field: 'stamps' } }, unique_games: { cardinality: { field: 'game_id' } } } },
    one_time_players: { rare_terms: { field: 'member_id', max_doc_count: 1 } },
    game_options: { terms: { field: 'name.keyword', size: 500, order: { _key: 'asc' } } }
  } });
  var a = res.aggregations, plays = res.hits.total.value, players = a.unique_players.value, stamps = a.total_stamps.value;
  PM.gameRows = a.games.buckets.map(function (b) {
    var p = b.unique_players.value, s = b.total_stamps.value;
    return { game_id: b.key, game_name: (b.game_name.buckets[0] || {}).key || 'Unknown Game', game_plays: b.doc_count, unique_players: p,
      total_stamps: s, avg_stamps_per_play: b.doc_count ? s / b.doc_count : 0, avg_plays_per_player: p ? b.doc_count / p : 0 };
  });
  PM.playerRows = a.players.buckets.map(function (b) {
    return { member_id: b.key, game_plays: b.doc_count, total_stamps: b.total_stamps.value, unique_games: b.unique_games.value,
      avg_stamps_per_play: b.doc_count ? b.total_stamps.value / b.doc_count : 0 };
  });
  PM.oneTime = a.one_time_players.buckets.length;
  PM.repeat = Math.max(0, players - PM.oneTime);
  PM.repeatRate = players > 0 ? PM.repeat / players * 100 : 0;
  PM.trendBuckets = a.trend.buckets;
  PM.gameOptions = a.game_options.buckets;
  PM.cards = [['Total Game Plays', PM.nf(plays)], ['Unique Players', PM.nf(players)], ['Total Stamps', PM.nf(stamps, 0)],
    ['Average Stamps per Play', PM.nf(plays ? stamps / plays : 0, 2)], ['Average Plays per Member', PM.nf(players ? plays / players : 0, 2)],
    ['Active Games', PM.nf(a.active_games.value)]];
  PM.cardsHtml = function () {
    return PM.cards.map(function (c) {
      return '<div class="col-xl-2 col-md-4 col-sm-6"><div class="card dashboard-card"><div class="card-body p-3"><p class="text-sm text-muted mb-1">' +
        PM.esc(c[0]) + '</p><h5 class="mb-0">' + PM.esc(c[1]) + '</h5></div></div></div>';
    }).join('');
  };
  PM.gameOptionsHtml = function () {
    var keys = PM.gameOptions.map(function (o) { return String(o.key); });
    var html = keys.map(function (k) { return '<option value="' + PM.esc(k) + '"' + (PM.game === k ? ' selected' : '') + '>' + PM.esc(k) + '</option>'; }).join('');
    if (PM.game && keys.indexOf(PM.game) === -1) html += '<option value="' + PM.esc(PM.game) + '" selected>' + PM.esc(PM.game) + '</option>';
    return html;
  };
})();
