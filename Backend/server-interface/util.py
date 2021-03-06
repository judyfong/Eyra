# Copyright 2016 The Eyra Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# File author/s:
#     Matthias Petursson <oldschool01123@gmail.com>
#
# utility functions for server-interface

import sys
import unicodedata
import re
import MySQLdb
import os

from datetime import datetime
from celery.utils.log import get_task_logger

from config import dbConst # grab data needed to connect to database

def errLog(x):
    """
    Logs x to celery INFO. Used as a callback in sh piping to manually print
      otherwise swallowed error logs.
    """
    logger = get_task_logger(__name__)
    logger.info(x)

def log(msg, e=None):
    """
    e is an optional exception to log as well
    """
    exceptionText = ''
    if e is not None:
        exceptionText = ' {}'.format(repr(e))
    # http://stackoverflow.com/questions/32550487/how-to-print-from-flask-app-route-to-python-console
    date = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')
    print('{} {}{}'.format(str(date), str(msg), exceptionText), file=sys.stderr)

def simpleLog(msg):
    """
    Used for logging where we only want first argument,
      but a second one would be supplied. So we avoid the
      optional argument to log()
    """
    log(msg)

def filename(name):
    """
    return name as a valid filename on unix
    change spaces to hyphens and '/' to '\'
    removes trailing/leading whitespace.
    """
    name = unicodedata.normalize('NFKC', name)
    name = re.sub('[-\s]+', '-', name, flags=re.U).strip()
    return name.replace('/', '\\')

def isWavHeaderOnly(wavAbsPath) -> bool:
    """
    Parameters:
        wavAbsPath  absolute path to a wav file

    Return:
        True if wav file contains only a wav header and no data (is 44 bytes)
    """
    return os.path.getsize(wavAbsPath) == 44

class DbWork():
    """
    Class for db opperations without an app instance.
    """
    def __init__(self):
        self.db = MySQLdb.connect(**dbConst)

    def verifyTokenId(self, tokenId, token):
            """
            Accepts a token id and token and verifies this id
            is correct (comparing to the token in database and its id)

            Parameters:

                tokenId     id of token
                token       token text
            """
            try:
                cur = self.db.cursor()
                cur.execute('SELECT inputToken FROM token WHERE id=%s', (tokenId,))
                tokenFromDb = cur.fetchone()
                if tokenFromDb:
                    tokenFromDb = tokenFromDb[0] # fetchone returns tuple
                    if tokenFromDb == token:
                        return True
                    return False
                return False
            except MySQLdb.Error as e:
                msg = 'Error verifying token id, %d : %s' % (tokenId, token) 
                log(msg, e)
                raise
            else:
                return False

    def recCountBySession(self, sessionId):
        """
        Returns recording count as found in database for session.
        0 on failure

        Parameters:
            sessionId       id of session
        """
        try:
            cur = self.db.cursor()
            cur.execute('SELECT COUNT(*) FROM recording WHERE sessionId=%s', (sessionId,))
            recCnt = cur.fetchone()
            if recCnt:
                return recCnt[0] # fetchone returns tuple
            return 0
        except MySQLdb.Error as e:
            msg = 'Error grabbing rec count for session: {}'.format(sessionId) 
            log(msg, e)
            raise

    def sessionCount(self):
        """
        Returns session count from database.
        """
        try:
            cur = self.db.cursor()
            cur.execute('SELECT COUNT(*) FROM session')
            sesCnt = cur.fetchone()
            if sesCnt:
                return sesCnt[0] # fetchone returns tuple
            return 0
        except MySQLdb.Error as e:
            msg = 'Error grabbing session count.' 
            log(msg, e)
            raise

    def highestSessionId(self):
        """
        Returns highest session id used in database.
        """
        try:
            cur = self.db.cursor()
            cur.execute('SELECT MAX(id) FROM session')
            sesCnt = cur.fetchone()
            if sesCnt:
                return sesCnt[0] # fetchone returns tuple
            return 0
        except MySQLdb.Error as e:
            msg = 'Error grabbing session count.' 
            log(msg, e)
            raise
