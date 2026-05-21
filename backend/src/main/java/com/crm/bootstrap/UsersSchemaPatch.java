package com.crm.bootstrap;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Ensures {@code welcome_password_attempts} exists on legacy databases. Hibernate {@code ddl-auto: update}
 * does not always add new columns on Oracle.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UsersSchemaPatch implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UsersSchemaPatch.class);

    private final DataSource dataSource;

    public UsersSchemaPatch(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData meta = connection.getMetaData();
            String product = meta.getDatabaseProductName();
            if (product == null) {
                return;
            }
            String lower = product.toLowerCase();
            if (lower.contains("oracle")) {
                patchOracle(connection);
            } else if (lower.contains("postgresql")) {
                patchPostgres(connection);
            }
        } catch (SQLException ex) {
            log.warn("Could not apply USERS schema patch: {}", ex.getMessage());
        }
    }

    private void patchOracle(Connection connection) throws SQLException {
        if (columnExists(connection, "USERS", "WELCOME_PASSWORD_ATTEMPTS")) {
            return;
        }
        log.info("Adding USERS.welcome_password_attempts for welcome-password attempt tracking");
        try (Statement st = connection.createStatement()) {
            st.execute(
                    "ALTER TABLE USERS ADD welcome_password_attempts NUMBER(10) DEFAULT 0 NOT NULL");
        }
    }

    private void patchPostgres(Connection connection) throws SQLException {
        if (columnExists(connection, "users", "welcome_password_attempts")) {
            return;
        }
        log.info("Adding users.welcome_password_attempts for welcome-password attempt tracking");
        try (Statement st = connection.createStatement()) {
            st.execute(
                    "ALTER TABLE users ADD COLUMN welcome_password_attempts INT NOT NULL DEFAULT 0");
        }
    }

    private boolean columnExists(Connection connection, String table, String column)
            throws SQLException {
        DatabaseMetaData meta = connection.getMetaData();
        String catalog = connection.getCatalog();
        String schema = connection.getSchema();
        try (ResultSet rs = meta.getColumns(catalog, schema, table, column)) {
            if (rs.next()) {
                return true;
            }
        }
        try (ResultSet rs = meta.getColumns(catalog, schema, table.toLowerCase(), column.toLowerCase())) {
            return rs.next();
        }
    }
}
