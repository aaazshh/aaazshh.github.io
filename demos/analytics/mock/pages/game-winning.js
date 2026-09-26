// game-winning.php: prize claims per game, prize pool, prize type and member.
(function () {
  'use strict';
  var defTo = PM.daysAgo(1), defFrom = PM.firstOfMonth();
  if (defTo < defFrom) defFrom = defTo;
  var from = PM.get('date_from', defFrom).slice(0, 10), to = PM.get('date_to', defTo).slice(0, 10);
  if (to < from) to = from;
  PM.dateFrom = from; PM.dateTo = to;
  PM.gameId = PM.get('game_id', '').trim();
  PM.poolId = PM.get('prize_pool_id', '').trim();
  var num = function (v) { return isNaN(Number(v)) ? v : Number(v); };
  var filters = [{ range: { claim_date: { gte: from + 'T00:00:00', lte: to + 'T23:59:59' } } }];
  if (PM.gameId) filters.push({ term: { game_id: num(PM.gameId) } });
  if (PM.poolId) filters.push({ term: { prize_pool_id: num(PM.poolId) } });
  var ranked = function (dir) {
    return { terms: { field: 'prize_pool_id', size: 10, order: { _count: dir } }, aggs: { unique_winners: { cardinality: { field: 'member_id' } },
      prize_categories: { terms: { field: 'prize_type', size: 5, missing: -1 } } } };
  };
  var res = Es.search(Crm.winnings(), { size: 0, query: { bool: { filter: filters } }, aggs: {
    display_scope: { filter: { bool: { filter: filters } }, aggs: {
      unique_winners: { cardinality: { field: 'member_id' } }, active_games: { cardinality: { field: 'game_id' } },
      prize_categories: { cardinality: { field: 'prize_type' } }, active_prize_pools: { cardinality: { field: 'prize_pool_id' } },
      winning_trend: { date_histogram: { field: 'claim_date', calendar_interval: 'day', format: 'yyyy-MM-dd', min_doc_count: 0, extended_bounds: { min: from, max: to } },
        aggs: { unique_winners: { cardinality: { field: 'member_id' } } } },
      games: { terms: { field: 'game_id', size: 1000, order: { _count: 'desc' } },
        aggs: { unique_winners: { cardinality: { field: 'member_id' } }, active_prize_pools: { cardinality: { field: 'prize_pool_id' } } } },
      prize_pools: { terms: { field: 'prize_pool_id', size: 1000, order: { _count: 'desc' } }, aggs: { unique_winners: { cardinality: { field: 'member_id' } },
        prize_types: { terms: { field: 'prize_type', size: 20, order: { _key: 'asc' }, missing: -1 } } } },
      prize_types: { terms: { field: 'prize_type', size: 500, order: { _count: 'desc' } }, aggs: { unique_winners: { cardinality: { field: 'member_id' } } } },
      top_prizes: ranked('desc'), bottom_prizes: ranked('asc'),
      members: { terms: { field: 'member_id', size: 1000, order: { _count: 'desc' } },
        aggs: { unique_games: { cardinality: { field: 'game_id' } }, unique_prize_pools: { cardinality: { field: 'prize_pool_id' } } } }
    } },
    game_options: { terms: { field: 'game_id', size: 1000, order: { _key: 'asc' } } },
    prize_pool_options: { terms: { field: 'prize_pool_id', size: 1000, order: { _key: 'asc' } } }
  } });
  var a = res.aggregations, d = a.display_scope;
  var label = function (k) { return k === -1 || String(k) === '-1' ? 'Unknown' : String(k); };
  var cats = function (b) { var c = b.buckets.map(function (x) { return label(x.key); }); return c.length ? c.join(', ') : 'Unknown'; };
  var row = function (b, sub) { return { prize_pool_id: b.key, winning_records: b.doc_count, unique_winners: b.unique_winners.value, prize_category: cats(sub) }; };
  var records = d.doc_count, winners = d.unique_winners.value;
  PM.gameRows = d.games.buckets.map(function (b) {
    return { game_id: b.key, winning_records: b.doc_count, unique_winners: b.unique_winners.value, active_prize_pools: b.active_prize_pools.value };
  });
  PM.prizePoolRows = d.prize_pools.buckets.map(function (b) { return row(b, b.prize_types); });
  PM.rankedPrizeRows = { top10: d.top_prizes.buckets.map(function (b) { return row(b, b.prize_categories); }),
    bottom10: d.bottom_prizes.buckets.map(function (b) { return row(b, b.prize_categories); }) };
  PM.memberRows = d.members.buckets.map(function (b) {
    return { member_id: b.key, total_wins: b.doc_count, unique_games: b.unique_games.value, unique_prize_pools: b.unique_prize_pools.value };
  });
  PM.trendBuckets = d.winning_trend.buckets;
  PM.cards = [['Total Winning Records', PM.nf(records)], ['Unique Winners', PM.nf(winners)], ['Active Winning Games', PM.nf(d.active_games.value)],
    ['Prize Categories', PM.nf(d.prize_categories.value)], ['Prize Types / Prize Items', PM.nf(d.active_prize_pools.value)],
    ['Average Wins per Winner', PM.nf(winners ? records / winners : 0, 2)]];
  PM.cardsHtml = function () {
    return PM.cards.map(function (c) {
      return '<div class="col-xl-2 col-md-4 col-sm-6"><div class="card dashboard-card"><div class="card-body p-3"><p class="text-sm text-muted mb-1">' +
        PM.esc(c[0]) + '</p><h5 class="mb-0">' + PM.esc(c[1]) + '</h5></div></div></div>';
    }).join('');
  };
  PM.optionsHtml = function (which) {
    var opts = which === 'game' ? a.game_options.buckets : a.prize_pool_options.buckets, sel = which === 'game' ? PM.gameId : PM.poolId;
    var keys = opts.map(function (o) { return String(o.key); });
    var html = keys.map(function (k) { return '<option value="' + PM.esc(k) + '"' + (sel === k ? ' selected' : '') + '>' + PM.esc(k) + '</option>'; }).join('');
    if (sel && keys.indexOf(sel) === -1) html += '<option value="' + PM.esc(sel) + '" selected>' + PM.esc(sel) + '</option>';
    return html;
  };
})();
