begin;

insert into public.question_modules (
  module_key,
  module_type,
  title,
  description,
  schema_json,
  is_active
)
values
(
  'common_business_identity', 'common', '현재 사업장 기본 확인',
  '실제 사업장, 권한, 간판, 등록 정보와 공식 연락처를 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"customer_preferred_title","sectionKey":"current_business","label":"어떻게 불러드리면 편하실까요?","type":"text","sortOrder":10},
    {"key":"preferred_contact_method","sectionKey":"current_business","label":"추가 확인이 필요할 때 어떤 방법이 가장 편하신가요?","type":"single_select","options":["전화","문자","카카오톡","이메일","통화로 설명하고 싶어요"],"sortOrder":20},
    {"key":"relationship_to_business","sectionKey":"current_business","label":"현재 사업장과 어떤 관계이신가요?","type":"single_select","options":["대표자","공동 운영자","공식 담당자","직원","대행사","확인이 필요해요"],"sortOrder":30},
    {"key":"authority_status","sectionKey":"current_business","label":"대표님이 직접 운영하시거나 공식적으로 관리를 맡고 계신 사업장이 맞으실까요?","helpText":"누가 잘못했는지를 판단하려는 질문이 아닙니다.","type":"single_select","options":["맞아요","공식 담당자예요","확인이 필요해요","잘 모르겠어요"],"sortOrder":40},
    {"key":"sign_name","sectionKey":"current_business","label":"건물 밖에서 항상 보이는 간판 이름은 무엇인가요?","type":"text","sortOrder":50},
    {"key":"entrance_sign_name","sectionKey":"current_business","label":"출입구에 표시된 이름이 다르다면 알려주세요.","type":"text","sortOrder":60},
    {"key":"registration_name","sectionKey":"current_business","label":"사업자등록증에 적힌 상호는 무엇인가요?","type":"text","sortOrder":70},
    {"key":"permit_name","sectionKey":"current_business","label":"영업허가증 또는 신고증의 업체명은 무엇인가요?","type":"text","sortOrder":80},
    {"key":"official_address","sectionKey":"current_business","label":"고객이 실제로 찾아오는 주소를 알려주세요.","type":"text","sortOrder":90},
    {"key":"floor_structure","sectionKey":"current_business","label":"사용하는 층과 층별 운영 형태를 알려주세요.","type":"textarea","sortOrder":100},
    {"key":"primary_activity","sectionKey":"current_business","label":"고객에게 실제로 제공하는 주된 서비스는 무엇인가요?","type":"textarea","sortOrder":110},
    {"key":"opening_hours","sectionKey":"current_business","label":"고객이 방문하거나 연락할 수 있는 실제 운영 시간을 알려주세요.","type":"text","sortOrder":120},
    {"key":"official_phone","sectionKey":"current_business","label":"사업장에서 직접 관리하는 대표 전화번호가 있나요?","type":"text","sortOrder":130},
    {"key":"official_website","sectionKey":"current_business","label":"사업장에서 직접 관리하는 웹사이트나 공식 SNS가 있나요?","type":"text","sortOrder":140},
    {"key":"desired_standard_name","sectionKey":"current_business","label":"앞으로 하나의 공식 기준으로 맞추고 싶은 업체명을 알려주세요.","type":"text","sortOrder":150},
    {"key":"keyword_name_history","sectionKey":"current_business","label":"과거 업체명에 지역명이나 업종 설명이 함께 들어간 적이 있다면, 실제 간판명이었는지, 검색 노출을 위한 표현이었는지, 당시 대행업체가 제안한 내용이었는지 기억나는 범위에서 알려주세요.","type":"textarea","sortOrder":160}
  ]}$json$::jsonb, true
),
(
  'common_history', 'common', '과거 등록 흐름',
  '첫 등록부터 정지, 삭제, 이의신청까지 큰 흐름을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"first_registration_period","sectionKey":"history_summary","label":"처음 Google 지도 등록을 시도한 시기는 언제쯤인가요?","type":"date_period","sortOrder":10},
    {"key":"creation_attempt_count","sectionKey":"history_summary","label":"지금까지 새로 만들거나 다시 등록한 횟수는 대략 몇 번인가요?","type":"number","sortOrder":20},
    {"key":"suspension_count","sectionKey":"history_summary","label":"정지되거나 검색에서 사라진 횟수는 대략 몇 번인가요?","type":"number","sortOrder":30},
    {"key":"account_count","sectionKey":"history_summary","label":"등록에 사용한 Google 계정은 대략 몇 개인가요?","type":"number","sortOrder":40},
    {"key":"third_party_count","sectionKey":"history_summary","label":"등록을 도운 대행사, 직원, 예약 담당자 또는 마케터는 대략 몇 팀인가요?","type":"number","sortOrder":50},
    {"key":"old_account_access_status","sectionKey":"history_summary","label":"예전에 관리하던 Google 계정에 지금도 로그인할 수 있나요?","type":"single_select","options":["로그인할 수 있어요","로그인할 수 없어요","어떤 계정인지 몰라요","확인이 필요해요"],"sortOrder":60},
    {"key":"appeal_status","sectionKey":"history_summary","label":"현재 이의신청이나 재검토가 진행 중인지 알고 계신가요?","type":"single_select","options":["진행 중이에요","승인됐어요","거절됐어요","신청하지 않았어요","잘 모르겠어요"],"sortOrder":70},
    {"key":"recreated_during_appeal","sectionKey":"history_summary","label":"이의신청 결과를 기다리는 동안 다른 계정으로 새 프로필을 만든 적이 있나요?","type":"single_select","options":["있어요","없어요","잘 모르겠어요","해당 없음"],"sortOrder":80},
    {"key":"overall_history","sectionKey":"history_summary","label":"기억나는 전체 흐름을 편한 말로 적어주세요.","helpText":"정확한 날짜나 순서가 아니어도 괜찮습니다.","type":"textarea","sortOrder":90}
  ]}$json$::jsonb, true
),
(
  'common_changes', 'common', '변경 사항과 외부 담당자',
  '프로필 결과 전후의 변경과 외부 담당자 참여를 부드럽게 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"third_party_involvement","sectionKey":"changes","label":"과거 등록이나 관리를 맡았던 분이 있다면 알려주세요.","type":"multi_select","options":["대행사","예약 담당자","직원","마케터","웹사이트 관리자","없음","잘 모르겠어요","확인이 필요해요"],"sortOrder":10},
    {"key":"changed_fields","sectionKey":"changes","label":"프로필이 사라지기 전후로 달라진 정보가 있었나요?","type":"multi_select","options":["업체명","전화번호","웹사이트","카테고리","주소 또는 층","지도 핀","영업시간","소유자 또는 관리자","없음","잘 모르겠어요"],"sortOrder":20},
    {"key":"review_service_proposals","sectionKey":"changes","label":"리뷰 관리, 위치 변경 또는 반복 등록과 관련한 제안을 받은 적이 있나요?","type":"single_select","options":["기억나요","없음","잘 모르겠어요","확인이 필요해요"],"sortOrder":30},
    {"key":"shared_business_identifiers","sectionKey":"changes","label":"다른 사업장이 같은 전화번호, 웹사이트, Google 계정, 주소 또는 업체명을 사용하는지 알고 계신가요?","type":"single_select","options":["기억나요","없음","잘 모르겠어요","확인이 필요해요"],"sortOrder":40}
  ]}$json$::jsonb, true
),
(
  'common_evidence', 'common', '확인 자료',
  '자료 보유 여부와 안전한 제출 원칙을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"evidence_availability","sectionKey":"evidence","label":"현재 바로 확인할 수 있는 자료가 있나요?","type":"multi_select","options":["간판·외관 사진","출입구·내부 사진","사업자등록증","영업허가증","과거 Google 이메일","이의신청 화면","프로필 관리 화면","웹사이트·전화 관리 증빙","지금은 없음","확인이 필요해요"],"sortOrder":10},
    {"key":"sensitive_data_confirmation","sectionKey":"evidence","label":"불필요한 민감정보를 가린 뒤 자료를 제출하실 수 있나요?","helpText":"Google 비밀번호, OTP, 복구 코드는 어떤 경우에도 제출하지 마세요.","type":"single_select","options":["네","도움이 필요해요","자료를 제출하지 않을게요"],"sortOrder":20}
  ]}$json$::jsonb, true
),
(
  'common_goals', 'common', '원하는 결과',
  '고객이 중요하게 생각하는 결과와 과정 기대치를 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"priority_goals","sectionKey":"goals","label":"이번 작업에서 우선 확인하고 싶은 결과를 골라주세요.","type":"multi_select","options":["원인 이해","기존 공식 프로필 복구","기존 프로필 소유권 요청","정보 불일치 수정","중복 프로필 정리","공식 이의신청 준비","정책상 가능한 경우에만 신규 등록","향후 지점 운영 기준","가능한 것과 어려운 것에 대한 명확한 설명"],"sortOrder":10},
    {"key":"success_definition","sectionKey":"goals","label":"이번 작업이 잘 마무리됐다고 느끼시려면 어떤 상태가 가장 중요하실까요?","type":"textarea","sortOrder":20},
    {"key":"process_expectation","sectionKey":"goals","label":"문제가 한 번에 해결되지 않더라도, 원인을 확인하고 다음 가능한 경로를 함께 찾는 과정이 필요하신가요?","type":"single_select","options":["네, 과정이 필요해요","먼저 설명을 듣고 싶어요","잘 모르겠어요"],"sortOrder":30}
  ]}$json$::jsonb, true
),
(
  'common_confirmation', 'common', '마지막 확인',
  '진단 범위와 안전한 제출 원칙을 읽기 쉽게 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"final_confirmation","sectionKey":"confirmation","label":"답변은 기억과 현재 확인 가능한 자료를 기준으로 작성했고, 모르는 내용은 모른다고 표시했습니다.","type":"confirmation","required":true,"sortOrder":10},
    {"key":"credential_confirmation","sectionKey":"confirmation","label":"Google 비밀번호, OTP, 복구 코드를 제출하지 않았습니다.","type":"confirmation","required":true,"sortOrder":20},
    {"key":"scope_confirmation","sectionKey":"confirmation","label":"이 진단은 Google 승인이나 복구를 보장하지 않으며, 현재 한 사업장 사건의 공식적이고 합리적인 경로를 확인하기 위한 과정임을 이해했습니다.","type":"confirmation","required":true,"sortOrder":30}
  ]}$json$::jsonb, true
),
(
  'industry_restaurant', 'industry', '음식점', '상시 간판, 좌석 운영, 허가와 고객 방문 형태를 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"restaurant_service_structure","sectionKey":"current_business","label":"매장 식사, 포장, 배달 중 실제 운영 형태를 알려주세요.","type":"multi_select","options":["매장 식사","포장","배달","예약제","잘 모르겠어요"],"sortOrder":210},
    {"key":"restaurant_permit_match","sectionKey":"current_business","label":"영업신고증의 주소와 상호가 현재 운영과 일치하나요?","type":"single_select","options":["일치해요","일부 달라요","확인이 필요해요","잘 모르겠어요"],"sortOrder":220}
  ]}$json$::jsonb, true
),
(
  'industry_accommodation', 'industry', '숙박업', '숙박 허가, 프런트, 예약 채널과 실제 고객 접점을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"accommodation_front_desk","sectionKey":"current_business","label":"고객이 체크인하는 상시 프런트나 안내 데스크가 있나요?","type":"single_select","options":["있어요","없어요","시간대별로 달라요","확인이 필요해요"],"sortOrder":210},
    {"key":"accommodation_booking_standard","sectionKey":"current_business","label":"공식 예약 채널에서 사용하는 대표 업체명과 주소를 알려주세요.","type":"textarea","sortOrder":220}
  ]}$json$::jsonb, true
),
(
  'industry_nightlife_entertainment', 'industry', '유흥·엔터테인먼트', '간판, 출입 구조, 층별 운영, 예약과 허가 정보를 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"nightlife_entry_operation","sectionKey":"current_business","label":"고객은 어느 출입구로 들어오고, 안내나 결제는 어느 층에서 이루어지나요?","type":"textarea","sortOrder":210},
    {"key":"nightlife_floor_independence","sectionKey":"current_business","label":"각 층에 별도 간판, 직원, 계산대, 전화, 웹사이트 또는 영업허가가 있는지 알려주세요.","type":"textarea","sortOrder":220},
    {"key":"nightlife_booking_name","sectionKey":"current_business","label":"예약 안내에서 고객에게 사용하는 업체명은 무엇인가요?","type":"text","sortOrder":230}
  ]}$json$::jsonb, true
),
(
  'industry_office_service', 'industry', '사무실·서비스업', '고객 방문 가능 여부와 서비스 지역을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"office_customer_visits","sectionKey":"current_business","label":"표시된 운영 시간에 고객이 이 장소를 방문할 수 있나요?","type":"single_select","options":["방문할 수 있어요","예약 시 가능해요","고객 방문 장소가 아니에요","확인이 필요해요"],"sortOrder":210},
    {"key":"office_service_area","sectionKey":"current_business","label":"고객을 찾아가는 서비스라면 실제 서비스 지역을 알려주세요.","type":"textarea","sortOrder":220}
  ]}$json$::jsonb, true
),
(
  'industry_medical', 'industry', '의료', '의료기관 명칭, 개설 신고, 진료 장소를 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"medical_license_name","sectionKey":"current_business","label":"의료기관 개설 신고 또는 허가에 표시된 명칭은 무엇인가요?","type":"text","sortOrder":210},
    {"key":"medical_practitioner_profiles","sectionKey":"current_business","label":"기관 프로필과 별도로 의료진 개인 프로필을 운영하고 있나요?","type":"single_select","options":["운영해요","운영하지 않아요","잘 모르겠어요"],"sortOrder":220}
  ]}$json$::jsonb, true
),
(
  'industry_construction_industrial', 'industry', '건설·산업', '고객 방문 장소, 현장 서비스, 표지와 사무실 운영을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"industrial_visit_structure","sectionKey":"current_business","label":"고객이 방문하는 사무실인가요, 현장으로 찾아가는 서비스인가요?","type":"single_select","options":["고객 방문 사무실","현장 방문 서비스","둘 다","확인이 필요해요"],"sortOrder":210},
    {"key":"industrial_location_sign","sectionKey":"current_business","label":"주소지에 상시 회사 표지와 업무 공간이 있나요?","type":"single_select","options":["있어요","없어요","확인이 필요해요"],"sortOrder":220}
  ]}$json$::jsonb, true
),
(
  'industry_multi_location', 'industry', '다지점 사업', '지점별 독립 운영과 공식 관리 기준을 확인합니다.',
  $json${"version":1,"questions":[
    {"key":"location_independence","sectionKey":"current_business","label":"각 지점이 별도 직원, 전화, 운영시간, 간판으로 독립 운영되나요?","type":"single_select","options":["대체로 독립적이에요","일부만 독립적이에요","공통으로 운영해요","확인이 필요해요"],"sortOrder":210},
    {"key":"future_location_standard","sectionKey":"goals","label":"향후 지점에서 공통으로 지키고 싶은 업체명, 계정, 전화, 웹사이트 관리 기준이 있나요?","type":"textarea","sortOrder":210}
  ]}$json$::jsonb, true
),
(
  'issue_new_registration', 'issue', '신규 등록', '기존 프로필과 이의신청을 먼저 확인한 뒤 신규 등록 가능성을 검토합니다.',
  $json${"version":1,"questions":[{"key":"new_registration_existing_search","sectionKey":"history_summary","label":"같은 사업장이나 이름으로 과거 프로필이 있었는지 먼저 검색해보셨나요?","type":"single_select","options":["확인했어요","아직 확인하지 않았어요","잘 모르겠어요"],"sortOrder":310}]}$json$::jsonb, true
),
(
  'issue_prior_suspension', 'issue', '기존 정지', '과거 정지 알림과 당시 관리 상태를 확인합니다.',
  $json${"version":1,"questions":[{"key":"prior_suspension_message","sectionKey":"history_summary","label":"과거 정지 안내에서 기억나는 문구나 남아 있는 이메일이 있나요?","type":"textarea","sortOrder":310}]}$json$::jsonb, true
),
(
  'issue_repeated_disappearance', 'issue', '반복 삭제·사라짐', '프로필이 반복해서 사라진 시점과 직전 변경을 확인합니다.',
  $json${"version":1,"questions":[{"key":"disappearance_pattern","sectionKey":"history_summary","label":"프로필이 사라질 때마다 비슷하게 반복된 변경이나 진행 방식이 있었나요?","type":"textarea","sortOrder":320}]}$json$::jsonb, true
),
(
  'issue_duplicate_profiles', 'issue', '중복 프로필 후보', '현재 관련 프로필 후보를 중립적으로 비교합니다.',
  $json${"version":1,"questions":[{"key":"duplicate_relation_basis","sectionKey":"profile_candidates","label":"여러 프로필이 같은 사업장이라고 생각하신 이유를 기억나는 범위에서 알려주세요.","type":"textarea","sortOrder":310}]}$json$::jsonb, true
),
(
  'issue_unknown_third_party_ownership', 'issue', '제3자 소유 가능성', '알 수 없는 관리자나 제3자가 만든 프로필의 접근 가능성을 확인합니다.',
  $json${"version":1,"questions":[{"key":"unknown_owner_access","sectionKey":"profile_candidates","label":"현재 프로필 중 대표님이 직접 관리하거나 액세스를 요청할 수 있는 항목이 있나요?","type":"single_select","options":["직접 관리할 수 있어요","액세스 요청은 가능해 보여요","관리할 수 없어요","잘 모르겠어요"],"sortOrder":320}]}$json$::jsonb, true
),
(
  'issue_ownership_request', 'issue', '소유권 요청', '기존 프로필의 소유권 요청 이력과 현재 상태를 확인합니다.',
  $json${"version":1,"questions":[{"key":"ownership_request_history","sectionKey":"profile_candidates","label":"기존 프로필에 소유권 또는 관리자 액세스를 요청한 적이 있나요?","type":"single_select","options":["진행 중이에요","승인됐어요","거절됐어요","요청하지 않았어요","잘 모르겠어요"],"sortOrder":330}]}$json$::jsonb, true
),
(
  'issue_appeal_in_progress', 'issue', '이의신청 진행 중', '진행 중인 공식 절차와 추가 생성 여부를 확인합니다.',
  $json${"version":1,"questions":[{"key":"appeal_reference_available","sectionKey":"history_summary","label":"진행 중인 이의신청의 접수 화면이나 이메일을 확인할 수 있나요?","type":"single_select","options":["확인할 수 있어요","찾아봐야 해요","확인할 수 없어요","잘 모르겠어요"],"sortOrder":330}]}$json$::jsonb, true
),
(
  'issue_appeal_status_unknown', 'issue', '이의신청 상태 미확인', '과거 계정과 메일에서 공식 절차 상태를 먼저 찾습니다.',
  $json${"version":1,"questions":[{"key":"appeal_search_possible","sectionKey":"history_summary","label":"예전에 사용한 계정의 Google 이메일에서 정지나 이의신청 안내를 찾아볼 수 있을까요?","type":"single_select","options":["찾아볼 수 있어요","계정 접근부터 확인해야 해요","어려워요","잘 모르겠어요"],"sortOrder":340}]}$json$::jsonb, true
),
(
  'issue_multiple_floors', 'issue', '여러 층', '층별 독립 사업 여부와 실제 고객 동선을 확인합니다.',
  $json${"version":1,"questions":[{"key":"floor_separation","sectionKey":"current_business","label":"각 층은 한 사업장, 별도 사업장, 별도 브랜드 중 어디에 가까운가요?","type":"single_select","options":["한 사업장이 여러 층을 사용해요","층마다 별도 사업장이에요","층마다 별도 브랜드예요","잘 모르겠어요"],"sortOrder":310}]}$json$::jsonb, true
),
(
  'issue_multiple_brands_address', 'issue', '한 주소의 여러 브랜드', '같은 주소에서 운영되는 브랜드의 독립성을 확인합니다.',
  $json${"version":1,"questions":[{"key":"brand_independence","sectionKey":"current_business","label":"각 브랜드에 별도 간판, 출입구, 직원, 계산대, 전화, 웹사이트, 영업허가가 있나요?","type":"textarea","sortOrder":320}]}$json$::jsonb, true
),
(
  'issue_address_pin_inconsistency', 'issue', '주소·층·지도 핀 불일치', '실제 입구와 지도상 위치 차이를 확인합니다.',
  $json${"version":1,"questions":[{"key":"map_pin_difference","sectionKey":"profile_candidates","label":"현재 지도 핀이 실제 고객 출입구와 얼마나 다른지 설명해주세요.","type":"textarea","sortOrder":340}]}$json$::jsonb, true
),
(
  'issue_business_name_inconsistency', 'issue', '업체명 불일치', '간판, 등록, 허가, 과거 프로필 이름의 차이를 확인합니다.',
  $json${"version":1,"questions":[{"key":"name_difference_reason","sectionKey":"changes","label":"간판명과 다른 업체명을 사용한 이유가 기억나시면 알려주세요.","type":"single_select","options":["실제 다른 간판이 있었어요","검색 설명을 넣었어요","대행사가 제안했어요","이전 상호였어요","잘 모르겠어요"],"sortOrder":310}]}$json$::jsonb, true
),
(
  'issue_phone_website_inconsistency', 'issue', '전화번호·웹사이트 불일치', '실제 관리하는 연락처와 과거 사용 정보를 구분합니다.',
  $json${"version":1,"questions":[{"key":"contact_difference_reason","sectionKey":"changes","label":"프로필마다 전화번호나 웹사이트가 달랐다면 누가 관리한 정보였는지 알려주세요.","type":"textarea","sortOrder":320}]}$json$::jsonb, true
),
(
  'issue_category_inconsistency', 'issue', '카테고리 불일치', '실제 주된 영업과 과거 카테고리 선택을 비교합니다.',
  $json${"version":1,"questions":[{"key":"category_change_history","sectionKey":"changes","label":"과거 카테고리를 바꾼 적이 있다면 당시 실제 영업 내용과 변경 이유를 알려주세요.","type":"textarea","sortOrder":330}]}$json$::jsonb, true
),
(
  'issue_verification_failure', 'issue', '인증 실패', '시도한 인증 방식과 실제 현장 조건을 확인합니다.',
  $json${"version":1,"questions":[{"key":"verification_failure_detail","sectionKey":"history_summary","label":"영상, 전화, 우편 등 어떤 인증을 시도했고 어느 단계에서 어려웠나요?","type":"textarea","sortOrder":350}]}$json$::jsonb, true
),
(
  'issue_rebranding', 'issue', '상호 변경', '이전 상호와 현재 상호의 연속성과 변경 증빙을 확인합니다.',
  $json${"version":1,"questions":[{"key":"rebrand_timeline","sectionKey":"changes","label":"상호를 변경한 시기와 간판, 허가, 웹사이트가 함께 바뀐 시기를 알려주세요.","type":"textarea","sortOrder":340}]}$json$::jsonb, true
),
(
  'issue_moved_location', 'issue', '이전·주소 변경', '이전 주소 프로필과 새 위치의 관계를 확인합니다.',
  $json${"version":1,"questions":[{"key":"move_timeline","sectionKey":"changes","label":"이전한 시기, 이전 주소 운영 종료 시점, 새 주소 영업 시작 시점을 알려주세요.","type":"textarea","sortOrder":350}]}$json$::jsonb, true
),
(
  'issue_multiple_agencies_managers', 'issue', '여러 대행사·관리자', '참여한 각 담당자의 역할과 계정 접근을 구분합니다.',
  $json${"version":1,"questions":[{"key":"manager_role_summary","sectionKey":"changes","label":"당시 진행을 맡았던 분마다 요청한 일과 사용한 계정이 기억나면 구분해서 적어주세요.","type":"textarea","sortOrder":360}]}$json$::jsonb, true
)
on conflict (module_key) do update
set module_type = excluded.module_type,
    title = excluded.title,
    description = excluded.description,
    schema_json = excluded.schema_json,
    is_active = excluded.is_active,
    updated_at = now();

commit;
