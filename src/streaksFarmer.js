CONFIG = {
    "TARGET_RATE": 2,
    "CONCURRENT_REQUESTS": 2,
    "BATCH_SIZE": 2,  # Process 3 sessions at once
    "REQUEST_INTERVAL": 222,  # 1000ms / 3 = 333ms between batches
    "MIN_REQUEST_DELAY": 30,  # Minimum delay between requests
    "MAX_CONSECUTIVE_ERRORS": 3,
    "RETRY_DELAY": 100,  # Short delay for retry
    "HEALTH_CHECK_INTERVAL": 100,
    "CHECKPOINT_INTERVAL": 90,
    "ADAPTIVE_DELAY_MIN": 100,
    "ADAPTIVE_DELAY_MAX": 500,
    "CONNECTION_POOL_SIZE": 3
}

# Default challenge types (optimized from JS template)
DEFAULT_CHALLENGE_TYPES = [
    "assist", "characterIntro", "characterMatch", "characterPuzzle",
    "characterSelect", "characterTrace", "characterWrite",
    "completeReverseTranslation", "definition", "dialogue",
    "extendedMatch", "extendedListenMatch", "form", "freeResponse",
    "gapFill", "judge", "listen", "listenComplete", "listenMatch",
    "match", "name", "listenComprehension", "listenIsolation",
    "listenSpeak", "listenTap", "orderTapComplete", "partialListen",
    "partialReverseTranslate", "patternTapComplete", "radioBinary",
    "radioImageSelect", "radioListenMatch", "radioListenRecognize",
    "radioSelect", "readComprehension", "reverseAssist",
    "sameDifferent", "select", "selectPronunciation",
    "selectTranscription", "svgPuzzle", "syllableTap",
    "syllableListenTap", "speak", "tapCloze", "tapClozeTable",
    "tapComplete", "tapCompleteTable", "tapDescribe", "translate",
    "transliterate", "transliterationAssist", "typeCloze",
    "typeClozeTable", "typeComplete", "typeCompleteTable",
    "writeComprehension"
]

# Session template (cached)
SESSION_TEMPLATE = {
    "challengeTypes": DEFAULT_CHALLENGE_TYPES,
    "isFinalLevel": False,
    "isV2": True,
    "juicy": True,
    "smartTipsVersion": 2,
    "type": "GLOBAL_PRACTICE"
}

class UltraFastRequestManager:
    def __init__(self, max_concurrent: int = 15):
        self.max_concurrent = max_concurrent
        self.active = 0
        self.queue = []
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0
        }

    async def add_task(self, task_coro):
        self.stats['total'] += 1
        
        async with self.semaphore:
            self.active += 1
            try:
                result = await task_coro
                self.stats['success'] += 1
                return result
            except Exception as e:
                self.stats['failed'] += 1
                raise e
            finally:
                self.active -= 1

    def get_stats(self):
        return self.stats.copy()

class OptimizedStreakFarm:
    def __init__(self, jwt_token: str, duolingo_user_id: str, from_lang: str, to_lang: str):
        self.jwt_token = jwt_token
        self.duolingo_user_id = duolingo_user_id
        self.from_lang = from_lang
        self.to_lang = to_lang
        self.session = None
        self.should_stop = False
        self.consecutive_errors = 0
        self.processed_dates = set()
        self.total_processed_sessions = 0
        self.last_batch_time = 0
        self.request_manager = UltraFastRequestManager(CONFIG["CONCURRENT_REQUESTS"])
        
        # User agents pool
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        ]

    def get_headers(self) -> Dict[str, str]:
        """Get optimized headers with random user agent"""
        return {
            "accept": "application/json",
            "authorization": f"Bearer {self.jwt_token}",
            "content-type": "application/json",
            "user-agent": random.choice(self.user_agents),
            "Referer": "https://www.duolingo.com/practice",
            "Origin": "https://www.duolingo.com",
            "Connection": "keep-alive"
        }

    async def precise_delay(self, ms: int):
        """Precise delay function matching JS implementation"""
        await asyncio.sleep(ms / 1000)

    async def adaptive_rate_limit(self):
        """Adaptive rate limiting to maintain 3 streaks/second"""
        current_time = asyncio.get_event_loop().time() * 1000
        time_since_last_batch = current_time - self.last_batch_time
        
        target_interval = 1000 / CONFIG["TARGET_RATE"]
        
        if time_since_last_batch < target_interval:
            delay_needed = target_interval - time_since_last_batch
            await self.precise_delay(delay_needed)
        
        self.last_batch_time = asyncio.get_event_loop().time() * 1000

    def handle_error(self, error: Exception, context: str = '') -> str:
        """Enhanced error handling with recovery"""
        print(f"Handled error in {context}: {str(error)}")
        
        # Reset consecutive errors after successful operations
        if self.consecutive_errors > 0 and random.random() > 0.3:
            self.consecutive_errors = max(0, self.consecutive_errors - 1)
        
        error_str = str(error).lower()
        
        if 'abort' in error_str:
            return 'abort'
        if '429' in error_str or 'rate limit' in error_str:
            return 'rate_limit'
        if 'server' in error_str or '5' in str(getattr(error, 'status', 0)):
            return 'server_error'
        if 'network' in error_str or 'connection' in error_str:
            return 'network_error'
        
        return 'unknown_error'

    async def execute_with_smart_retry(self, coro_func, max_retries: int = 2, context: str = ''):
        """Smart retry with exponential backoff"""
        for attempt in range(max_retries):
            if self.should_stop:
                raise Exception('Stopped by user')
            
            try:
                result = await coro_func()
                
                # Success - reset error counter
                if self.consecutive_errors > 0:
                    self.consecutive_errors = max(0, self.consecutive_errors - 1)
                
                return result
                
            except Exception as error:
                error_type = self.handle_error(error, context)
                self.consecutive_errors += 1
                
                # Quick retry strategies
                retry_delay = CONFIG["RETRY_DELAY"]
                should_retry = attempt < max_retries - 1
                
                if error_type == 'rate_limit':
                    retry_delay = 300
                elif error_type == 'abort':
                    retry_delay = 10
                elif error_type == 'server_error':
                    retry_delay = 500
                elif error_type == 'network_error':
                    retry_delay = 150
                else:
                    retry_delay = 200
                
                if not should_retry:
                    print(f"Failed after {max_retries} attempts: {str(error)}")
                    return None
                
                await self.precise_delay(retry_delay)
        
        return None

    async def api_request(self, method: str, url: str, headers: Dict[str, str], 
                         data: Optional[Dict] = None, timeout: int = 8000):
        """Enhanced API request with timeout and retry"""
        timeout_obj = aiohttp.ClientTimeout(total=timeout/1000)
        
        try:
            async with self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                timeout=timeout_obj
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"API request failed: {response.status}")
        except Exception as e:
            raise e

    async def fetch_streak_data(self, headers: Dict[str, str]):
        """Fetch streak data from API"""
        url = f"https://www.duolingo.com/2017-06-30/users/{self.duolingo_user_id}?fields=streakData"
        return await self.api_request('GET', url, headers)

    async def create_session(self, headers: Dict[str, str]):
        """Create session with optimized payload"""
        url = "https://www.duolingo.com/2017-06-30/sessions"
        payload = {
            **SESSION_TEMPLATE,
            "fromLanguage": self.from_lang,
            "learningLanguage": self.to_lang
        }
        return await self.api_request('POST', url, headers, payload)

    async def complete_session(self, session_data: Dict, headers: Dict[str, str], target_date: str):
        """Complete session with target date"""
        url = f"https://www.duolingo.com/2017-06-30/sessions/{session_data['id']}"
        
        # Parse target date and set timestamps
        target_datetime = datetime.datetime.fromisoformat(target_date.replace('Z', '+00:00'))
        start_time = int(target_datetime.timestamp())
        end_time = start_time + 112
        
        payload = {
            **session_data,
            "heartsLeft": 0,
            "startTime": start_time,
            "enableBonusPoints": False,
            "endTime": end_time,
            "failed": False,
            "maxInLessonStreak": 9,
            "shouldLearnThings": True
        }
        
        return await self.api_request('PUT', url, headers, payload)

    def generate_date_before_streak(self, streak_start_date: str, days_back: int) -> str:
        """Generate date before streak start with exact date arithmetic"""
        start_date = datetime.datetime.fromisoformat(streak_start_date)
        target_date = start_date - datetime.timedelta(days=days_back)
        target_date = target_date.replace(hour=12, minute=0, second=0, microsecond=0)
        return target_date.isoformat()

    def calculate_days_between(self, date1: str, date2: str) -> int:
        """Calculate days between two dates accurately"""
        d1 = datetime.datetime.fromisoformat(date1.split('T')[0])
        d2 = datetime.datetime.fromisoformat(date2.split('T')[0])
        d1 = d1.replace(hour=0, minute=0, second=0, microsecond=0)
        d2 = d2.replace(hour=0, minute=0, second=0, microsecond=0)
        diff_time = abs((d2 - d1).total_seconds())
        return int(diff_time / (24 * 60 * 60))

    async def get_current_streak_end_date(self, headers: Dict[str, str]) -> str:
        """Get current streak end date from API"""
        try:
            streak_data = await self.fetch_streak_data(headers)
            current_streak = streak_data.get('streakData', {}).get('currentStreak', [])
            
            if current_streak:
                return current_streak[-1]
            
            # Fallback to today's date
            today = datetime.datetime.now()
            today = today.replace(hour=0, minute=0, second=0, microsecond=0)
            return today.strftime("%Y-%m-%d")
            
        except Exception as e:
            print(f"Error getting current streak end date: {e}")
            today = datetime.datetime.now()
            today = today.replace(hour=0, minute=0, second=0, microsecond=0)
            return today.strftime("%Y-%m-%d")

    async def process_session_batch(self, dates: List[str], headers: Dict[str, str]) -> int:
        """Process batch of sessions concurrently"""
        tasks = []
        
        for i, target_date in enumerate(dates):
            async def process_single_session(date=target_date, index=i):
                try:
                    # Stagger requests to avoid thundering herd
                    if index > 0:
                        await self.precise_delay(index * 50)
                    
                    session_data = await self.execute_with_smart_retry(
                        lambda: self.create_session(headers),
                        2,
                        f'create_session_{index}'
                    )
                    
                    if not session_data:
                        return None
                    
                    result = await self.execute_with_smart_retry(
                        lambda: self.complete_session(session_data, headers, date),
                        2,
                        f'complete_session_{index}'
                    )
                    
                    return {'success': True, 'date': date} if result else None
                    
                except Exception as error:
                    print(f"Session failed for {date}: {str(error)}")
                    return None
            
            tasks.append(process_single_session())
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful results
        success_count = 0
        for result in results:
            if isinstance(result, dict) and result and result.get('success'):
                success_count += 1
        
        return success_count

async def farm_streaks_background(interaction, user_id, loops, jwt_token, duolingo_user_id, username, user_permissions, from_lang, to_lang):
    """Main streak farming function with ultra-stable optimizations"""
    streaks_farmed = 0
    start_time = datetime.datetime.now()
    
    # Initialize optimized streak farm
    farm = OptimizedStreakFarm(jwt_token, duolingo_user_id, from_lang, to_lang)
    
    # Create session with connection pooling
    connector = aiohttp.TCPConnector(
        limit=CONFIG["CONNECTION_POOL_SIZE"],
        limit_per_host=CONFIG["CONNECTION_POOL_SIZE"],
        keepalive_timeout=30,
        enable_cleanup_closed=True
    )
    
    farm.session = aiohttp.ClientSession(
        connector=connector,
        timeout=aiohttp.ClientTimeout(total=30)
    )
    
    try:
        # Get initial streak data
        headers = farm.get_headers()
        streak_data = await farm.execute_with_smart_retry(
            lambda: farm.fetch_streak_data(headers),
            3,
            'initial_streak_data'
        )
        
        if not streak_data or not streak_data.get('streakData', {}).get('longestStreak', {}).get('startDate'):
            print("No streak data found")
            return
        
        current_streak_start = streak_data['streakData']['longestStreak']['startDate']
        
        # Initialize processing variables
        days_back = 1
        processed_sessions = 0
        
        # Process streaks in optimized batches
        for batch_num in range(0, loops, CONFIG["BATCH_SIZE"]):
            if farm.should_stop:
                break
            
            # Apply adaptive rate limiting
            await farm.adaptive_rate_limit()
            
            # Prepare batch of dates
            batch_dates = []
            for i in range(CONFIG["BATCH_SIZE"]):
                if processed_sessions + i >= loops:
                    break
                
                target_date = farm.generate_date_before_streak(current_streak_start, days_back + i)
                target_date_key = target_date.split('T')[0]
                
                if target_date_key not in farm.processed_dates:
                    farm.processed_dates.add(target_date_key)
                    batch_dates.append(target_date)
            
            if not batch_dates:
                days_back += CONFIG["BATCH_SIZE"]
                continue
            
            # Process batch
            headers = farm.get_headers()  # Get fresh headers for each batch
            success_count = await farm.process_session_batch(batch_dates, headers)
            
            streaks_farmed += success_count
            processed_sessions += len(batch_dates)
            days_back += len(batch_dates)
            
            # Update active task progress
            if user_id in active_streaks_tasks:
                active_streaks_tasks[user_id]["loops_done"] = processed_sessions
            
            # Apply user permission speed delay
            delay = user_permissions["speed"] / 1000
            await asyncio.sleep(delay)
            
            # Health check periodically
            if processed_sessions % CONFIG["HEALTH_CHECK_INTERVAL"] == 0:
                try:
                    await farm.execute_with_smart_retry(
                        lambda: farm.fetch_streak_data(headers),
                        1,
                        'health_check'
                    )
                except Exception:
                    pass  # Continue even if health check fails
        
    except Exception as e:
        print(f"Streaks Farm error: {e}")
    
    finally:
        # Cleanup
        if farm.session:
            await farm.session.close()
    
    # Save streaks data
    if user_id in accounts_data:
        for acc in accounts_data[user_id]:
            if acc.get("active", False):
                acc["streaks_farmed"] = acc.get("streaks_farmed", 0) + streaks_farmed
                break
        save_data(accounts_data, DATA_FILE)

    # Clean up active task
    if user_id in active_streaks_tasks:
        del active_streaks_tasks[user_id]

    # Set cooldown
    if user_permissions["cooldown"] > 0:
        user_cooldowns[user_id] = datetime.datetime.now() + datetime.timedelta(seconds=user_permissions["cooldown"])

    end_time = datetime.datetime.now()
    total_time = (end_time - start_time).total_seconds()
    minutes = int(total_time // 60)
    seconds = int(total_time % 60)

    try:
        message = await interaction.original_response()
        
        success_embed = create_base_embed(
            interaction,
            "<:avatar:1386360618822668368> Duo•SM: Streaks Success <:streak:1395025429878014065>",
            f"<:users:1386717655570059264> **Tài khoản:** {username}\n"
            f"<:streak:1367794775004024963> **Streaks tạo được:** {streaks_farmed}\n"
            f"<:time:1386718706100600923> **Thời gian:** {minutes}p {seconds}s\n",
            color=discord.Color.from_str("#FFA500")
        )
        
        await message.edit(embed=success_embed)
        
    except Exception as e:
        print(f"Error editing message: {e}")

    try:
        notification_channel = bot.get_channel(NOTIFICATION_CHANNEL_ID)
        if notification_channel:
            notification_embed = create_base_embed(
                interaction,
                "<:avatar:1386360618822668368> Duo•SM: Streaks Success <:streak:1395025429878014065>",
                f"<:users:1386717655570059264> **User:** {interaction.user.mention}\n"
                f"<:accounts:1386717929835335690> **Account:** **{username}**\n"
                f"<:streak:1367794775004024963> **Total Gained:** **{streaks_farmed}**\n"
                f"<:time:1386718706100600923> **Time:** **{minutes}p {seconds}s**",
                color=discord.Color.from_str("#FFA500")
            )
            
            await notification_channel.send(embed=notification_embed)
            
    except Exception as e:
        print(f"Error sending notification: {e}")

# Helper functions remain the same
def calculate_days_between(date1, date2):
    """Calculate days between two dates"""
    d1 = datetime.datetime.strptime(date1, "%Y-%m-%d")
    d2 = datetime.datetime.strptime(date2, "%Y-%m-%d")
    d1 = d1.replace(hour=0, minute=0, second=0, microsecond=0)
    d2 = d2.replace(hour=0, minute=0, second=0, microsecond=0)
    diff_time = abs((d2 - d1).total_seconds())
    return int(diff_time / (24 * 60 * 60))

def generate_target_date(streak_start_date, target_date_string):
    """Generate target date"""
    target_date = datetime.datetime.strptime(target_date_string, "%Y-%m-%d")
    target_date = target_date.replace(hour=12, minute=0, second=0, microsecond=0)
    return target_date.isoformat()

def generate_date_before_streak(streak_start_date, days_back):
    """Generate date before streak"""
    start_date = datetime.datetime.strptime(streak_start_date, "%Y-%m-%d")
    target_date = start_date - datetime.timedelta(days=days_back)
    target_date = target_date.replace(hour=12, minute=0, second=0, microsecond=0)
    return target_date.isoformat()

async def get_current_streak_end_date(user_id, headers):
    """Get current streak end date"""
    try:
        session = await get_session_pool()
        streak_data_url = f"https://www.duolingo.com/2017-06-30/users/{user_id}?fields=streakData"
        
        async with session.get(streak_data_url, headers=headers) as response:
            if response.status == 200:
                streak_response = await response.json()
                streak_data = streak_response.get("streakData", {})
                current_streak = streak_data.get("currentStreak", [])
                
                if current_streak:
                    return current_streak[-1]
        
        # Fallback to today's date
        today = datetime.datetime.now()
        today = today.replace(hour=0, minute=0, second=0, microsecond=0)
        return today.strftime("%Y-%m-%d")
        
    except Exception as e:
        print(f"Error getting current streak end date: {e}")
        today = datetime.datetime.now()
        today = today.replace(hour=0, minute=0, second=0, microsecond=0)
        return today.strftime("%Y-%m-%d")
  
