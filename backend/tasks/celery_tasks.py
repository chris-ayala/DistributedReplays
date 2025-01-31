# Celery workers
import base64
import json
import time
from enum import Enum, auto
from typing import Dict

import requests
from celery import Celery
from celery.result import AsyncResult
from celery.task import periodic_task

from backend.blueprints.spa_api.service_layers.leaderboards import Leaderboards
from backend.database.startup import lazy_get_redis, lazy_startup
from backend.database.wrapper.player_wrapper import PlayerWrapper
from backend.database.wrapper.stats.item_stats_wrapper import ItemStatsWrapper
from backend.database.wrapper.stats.player_stat_wrapper import PlayerStatWrapper
from backend.tasks import celeryconfig
from backend.tasks.add_replay import parse_replay
from backend.tasks.middleware import DBTask
from backend.tasks.periodic_stats import calculate_global_distributions
try:
    from backend.tasks.training_packs.task import TrainingPackCreation
    from backend.utils.metrics import METRICS_TRAINING_PACK_CREATION_TIME
except (ModuleNotFoundError, ImportError):
    TrainingPackCreation = None
    print("Missing config or AES Key and CRC, not creating training packs")

try:
    from backend.tasks.training_packs.training_packs import create_pack_from_replays
except:
    pass

celery = Celery(__name__, broker=celeryconfig.broker_url)


def create_celery_config():
    celery.config_from_object(celeryconfig)


player_wrapper = PlayerWrapper(limit=10)
player_stat_wrapper = PlayerStatWrapper(player_wrapper)


@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(60 * 60 * 24 * 3, calc_global_stats.s(), name='calculate global stats every 3 days')
    sender.add_periodic_task(60 * 60 * 24, calc_global_dists.s(), name='calculate global dists every day')
    sender.add_periodic_task(60 * 60 * 24, calc_leaderboards.s(), name='calculate leaderboards every day')
    sender.add_periodic_task(60 * 60 * 24 * 3, calc_leaderboards.s(), name='calculate item stats every 3 days')


def add_replay_parse_task(replay_to_parse_path, query_params: Dict[str, any] = None, **kwargs):
    return parse_replay_task.delay(*[replay_to_parse_path], **{**kwargs, **{'query_params': query_params}}, )


@celery.task(bind=True, priority=5)
def parse_replay_task(self, *args, **kwargs):
    return parse_replay(self, *args, **kwargs)


@celery.task(base=DBTask, bind=True, priority=9)
def parse_replay_task_low_priority(self, fn):
    return parse_replay_task(replay_to_parse_path=fn, preserve_upload_date=True)


@celery.task(base=DBTask, bind=True, priority=9)
def parse_replay_gcp(self, fn, gcp_url):
    with open(fn, 'rb') as f:
        encoded_file = base64.b64encode(f.read())
    r = requests.post(gcp_url, data=encoded_file, timeout=0.5)


@periodic_task(run_every=30.0, base=DBTask, bind=True, priority=0)
def calc_global_stats(self):
    sess = self.session()
    result = player_stat_wrapper.get_global_stats(sess)
    sess.close()
    if lazy_get_redis() is not None:
        lazy_get_redis().set('global_stats', json.dumps(result))
        lazy_get_redis().set('global_stats_expire', json.dumps(True))
    print('Done')
    return result


@periodic_task(run_every=24 * 60, base=DBTask, bind=True, priority=0)
def calc_leaderboards(self):
    leaderboards = Leaderboards.create()
    if lazy_get_redis() is not None:
        lazy_get_redis().set("leaderboards", json.dumps([l.__dict__ for l in leaderboards]))


@periodic_task(run_every=60 * 10, base=DBTask, bind=True, priority=0)
def calc_global_dists(self):
    sess = self.session()
    calculate_global_distributions()
    sess.close()


@periodic_task(run_every=24 * 60 * 60 * 3, base=DBTask, bind=True, priority=0)
def calc_item_stats(self, session=None):
    if session is None:
        sess = self.session()
    else:
        sess = session
    results = ItemStatsWrapper.create_stats(sess)
    if lazy_get_redis() is not None:
        lazy_get_redis().set('item_stats', json.dumps(results))


@celery.task(base=DBTask, bind=True, priority=9)
def create_training_pack(self, id_, n=10, date_start=None, date_end=None, session=None):
    if session is None:
        sess = self.session()
    else:
        sess = session
    start = time.time()
    url = TrainingPackCreation.create_from_player(id_, n, date_start, date_end, sess)
    end = time.time()
    METRICS_TRAINING_PACK_CREATION_TIME.observe(
        start - end
    )
    return url


class ResultState(Enum):
    PENDING = auto()
    STARTED = auto()
    RETRY = auto()
    FAILURE = auto()
    SUCCESS = auto()


def get_task_state(id_) -> ResultState:
    # NB: State will be PENDING for unknown ids.
    return ResultState[AsyncResult(id_, app=celery).state]


if __name__ == '__main__':
    sess = lazy_startup()
    calc_item_stats(None, session=sess())
