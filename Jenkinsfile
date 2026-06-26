pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    choice(
      name: 'TEST_SUITE',
      choices: ['checkout', 'smoke', 'full'],
      description: 'checkout runs cart/checkout tests and may place a production order. smoke runs @smoke tests only. full runs all tests.'
    )
  }

  environment {
    CI = 'true'
    TEST_ENV = 'production'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm ci'
            sh 'npx playwright install --with-deps chromium'
          } else {
            bat 'npm ci'
            bat 'npx.cmd playwright install chromium'
          }
        }
      }
    }

    stage('Run Tests') {
      steps {
        withCredentials([
          string(credentialsId: 'swagify-production-base-url', variable: 'PRODUCTION_BASE_URL'),
          string(credentialsId: 'swagify-website-access-password', variable: 'WEBSITE_ACCESS_PASSWORD'),
          usernamePassword(
            credentialsId: 'swagify-production-customer',
            usernameVariable: 'PRODUCTION_CUSTOMER_EMAIL',
            passwordVariable: 'PRODUCTION_CUSTOMER_PASSWORD'
          )
        ]) {
          script {
            if (params.TEST_SUITE == 'checkout') {
              if (isUnix()) {
                sh 'npm run test:checkout'
              } else {
                bat 'npm run test:checkout'
              }
            } else if (params.TEST_SUITE == 'full') {
              if (isUnix()) {
                sh 'npm test'
              } else {
                bat 'npm test'
              }
            } else {
              if (isUnix()) {
                sh 'npm run test:ci'
              } else {
                bat 'npm run test:ci'
              }
            }
          }
        }
      }
    }
  }

  post {
    always {
      script {
        if (isUnix()) {
          sh 'npm run dashboard'
        } else {
          bat 'npm run dashboard'
        }
      }

      junit allowEmptyResults: true, testResults: 'reports/junit/results.xml'

      archiveArtifacts(
        allowEmptyArchive: true,
        artifacts: 'playwright-report/**,reports/**,test-results/**',
        fingerprint: true
      )

      publishHTML(target: [
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])

      publishHTML(target: [
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports/dashboard',
        reportFiles: 'index.html',
        reportName: 'Swagify Dashboard'
      ])
    }
  }
}
